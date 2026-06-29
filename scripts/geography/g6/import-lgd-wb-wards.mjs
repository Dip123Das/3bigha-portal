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
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(i, i + 500), { onConflict: conflict });

    if (error) throw error;
  }
}

function priWards() {
  const rows = readRows("pri-wards");
  const h = findHeader(rows, ["ward code", "ward name"]);

  return rows.slice(h + 1).map((r) => ({
    lgd_local_body_code: toInt(r[1]),
    local_body_name_en: clean(r[2]) || null,
    local_body_type_name: clean(r[3]) || null,
    district_level_parent_name: clean(r[4]) || null,
    intermediate_level_parent_name: clean(r[5]) || null,
    lgd_ward_code: toInt(r[6]),
    ward_number: clean(r[7]) || null,
    ward_name_en: clean(r[8]),
    ward_name_local: clean(r[9]) || null,
    ward_category: "PRI",
    slug: slugify(`${clean(r[2])}-${clean(r[8])}-${clean(r[6])}`),
    source: "LGD",
  })).filter((r) => r.lgd_ward_code && r.ward_name_en && !r.ward_name_en.includes("("));
}

function urbanWardsFrom(folder) {
  const rows = readRows(folder);
  const h = findHeader(rows, ["ward code", "ward name"]);

  return rows.slice(h + 1).map((r) => ({
    lgd_local_body_code: toInt(r[1]),
    local_body_name_en: clean(r[2]) || null,
    local_body_type_name: null,
    district_level_parent_name: null,
    intermediate_level_parent_name: null,
    lgd_ward_code: toInt(r[3]),
    ward_number: clean(r[4]) || null,
    ward_name_en: clean(r[5]),
    ward_name_local: null,
    ward_category: "URBAN",
    slug: slugify(`${clean(r[2])}-${clean(r[5])}-${clean(r[3])}`),
    source: "LGD",
  })).filter((r) => r.lgd_ward_code && r.ward_name_en && !r.ward_name_en.includes("("));
}

async function main() {
  const rows = [
    ...priWards(),
    ...urbanWardsFrom("urban-local-body-wards"),
    ...urbanWardsFrom("urban-local-body-wards-covered"),
  ];

  const deduped = Array.from(
    new Map(rows.map((r) => [r.lgd_ward_code, r])).values()
  );

  console.log("G6-F West Bengal wards");
  console.log("Mode:", APPLY ? "APPLY" : "DRY RUN");
  console.log("Raw rows:", rows.length);
  console.log("Deduped rows:", deduped.length);

  await upsert("geo_lgd_wards", deduped, "lgd_ward_code");

  console.log("Done.");
}

main().catch((err) => {
  console.error("IMPORT FAILED:", err);
  process.exit(1);
});