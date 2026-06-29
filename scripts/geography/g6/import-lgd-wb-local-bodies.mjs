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

function priLocalBodies() {
  const rows = readRows("pri-local-bodies");
  const h = findHeader(rows, ["localbody code", "localbody name"]);

  return rows.slice(h + 1).map((r) => ({
    local_body_type_code: toInt(r[1]),
    local_body_type_name: clean(r[2]) || null,
    lgd_local_body_code: toInt(r[3]),
    local_body_version: toInt(r[4]),
    name_en: clean(r[5]),
    name_local: clean(r[6]) || null,
    parent_local_body_code: toInt(r[7]),
    local_body_category: "PRI",
    slug: slugify(r[5]),
    source: "LGD",
  })).filter((r) => r.lgd_local_body_code && r.name_en && !r.name_en.includes("("));
}

function urbanLocalBodies() {
  const rows = readRows("urban-local-bodies");
  const h = findHeader(rows, ["localbody code", "localbody name"]);

  return rows.slice(h + 1).map((r) => ({
    local_body_type_code: toInt(r[1]),
    local_body_type_name: clean(r[2]) || null,
    lgd_local_body_code: toInt(r[3]),
    local_body_version: toInt(r[4]),
    name_en: clean(r[5]),
    name_local: clean(r[6]) || null,
    parent_local_body_code: null,
    local_body_category: "URBAN",
    slug: slugify(r[5]),
    source: "LGD",
  })).filter((r) => r.lgd_local_body_code && r.name_en && !r.name_en.includes("("));
}

function traditionalLocalBodies() {
  const rows = readRows("town-local-bodies");
  const h = findHeader(rows, ["local body code", "local body name"]);

  return rows.slice(h + 1).map((r) => ({
    lgd_local_body_code: toInt(r[1]),
    local_body_version: toInt(r[2]),
    name_en: clean(r[3]),
    name_local: clean(r[4]) || null,
    local_body_type_code: toInt(r[5]),
    local_body_type_name: clean(r[6]) || null,
    parent_local_body_code: toInt(r[7]),
    local_body_category: "TRADITIONAL",
    slug: slugify(r[3]),
    source: "LGD",
  })).filter((r) => r.lgd_local_body_code && r.name_en && !r.name_en.includes("("));
}

async function main() {
  const rows = [
    ...priLocalBodies(),
    ...urbanLocalBodies(),
    ...traditionalLocalBodies(),
  ];

  console.log("G6-E West Bengal local bodies");
  console.log("Mode:", APPLY ? "APPLY" : "DRY RUN");

  await upsert("geo_lgd_local_bodies", rows, "lgd_local_body_code");

  console.log("Done.");
}

main().catch((err) => {
  console.error("IMPORT FAILED:", err);
  process.exit(1);
});