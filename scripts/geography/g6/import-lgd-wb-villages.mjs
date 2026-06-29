import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import path from "path";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const STATE = "west-bengal";
const LGD_ROOT = "data/lgd";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function clean(v) {
  return String(v ?? "").trim();
}

function toInt(v) {
  const n = Number(clean(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function slugify(v) {
  return clean(v)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readRows(folder) {
  const file = path.join(LGD_ROOT, folder, `${folder}-${STATE}.xls`);
  const wb = XLSX.readFile(file, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
}

function findHeader(rows, words) {
  let best = 0;
  let bestScore = -1;

  rows.slice(0, 20).forEach((row, i) => {
    const text = row.map(clean).join(" ").toLowerCase();
    const score = words.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });

  return best;
}

async function upsert(table, rows, conflict) {
  console.log(`${APPLY ? "IMPORT" : "DRY"} ${table}:`, rows.length);
  if (!APPLY || !rows.length) return;

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: conflict });

    if (error) throw error;
  }
}

function villages() {
  const rows = readRows("villages");
  const h = findHeader(rows, ["village code", "sub-district code"]);

  return rows
    .slice(h + 1)
    .map((r) => ({
      lgd_district_code: toInt(r[1]),
      lgd_subdistrict_code: toInt(r[3]),
      lgd_village_code: toInt(r[5]),
      village_version: toInt(r[6]),
      name_en: clean(r[7]),
      name_local: clean(r[8]) || null,
      village_status: clean(r[9]) || null,
      census_2001_code: clean(r[10]) || null,
      census_2011_code: clean(r[11]) || null,
      remark: clean(r[12]) || null,
      slug: slugify(r[7]),
      source: "LGD",
    }))
    .filter(
      (r) =>
        r.lgd_district_code &&
        r.lgd_subdistrict_code &&
        r.lgd_village_code &&
        r.name_en &&
        !r.name_en.includes("(")
    );
}

function blockVillageLinks() {
  const rows = readRows("block-covered-villages");
  const h = findHeader(rows, ["block code", "village code"]);

  return rows
    .slice(h + 1)
    .map((r) => ({
      lgd_state_code: toInt(r[0]),
      lgd_district_code: toInt(r[2]),
      lgd_block_code: toInt(r[4]),
      block_name_en: clean(r[5]) || null,
      lgd_village_code: toInt(r[6]),
      village_name_en: clean(r[7]) || null,
      source: "LGD",
    }))
    .filter((r) => r.lgd_block_code && r.lgd_village_code);
}

async function updateVillageBlocks(links) {
  console.log(`${APPLY ? "UPDATE" : "DRY"} village block references:`, links.length);
  if (!APPLY) return;

  for (let i = 0; i < links.length; i += 500) {
    const chunk = links.slice(i, i + 500);

    await Promise.all(
      chunk.map((x) =>
        supabase
          .from("geo_lgd_villages")
          .update({ lgd_block_code: x.lgd_block_code })
          .eq("lgd_village_code", x.lgd_village_code)
      )
    );
  }
}

async function main() {
  const villageRows = villages();
  const linkRows = blockVillageLinks();

  console.log("G6-D2 West Bengal villages");
  console.log("Mode:", APPLY ? "APPLY" : "DRY RUN");

  await upsert("geo_lgd_villages", villageRows, "lgd_village_code");
  await upsert("geo_lgd_block_villages", linkRows, "lgd_block_code,lgd_village_code");
  await updateVillageBlocks(linkRows);

  console.log("Done.");
}

main().catch((err) => {
  console.error("IMPORT FAILED:", err);
  process.exit(1);
});