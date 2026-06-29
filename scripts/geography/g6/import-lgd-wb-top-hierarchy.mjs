import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const STATE = "west-bengal";
const LGD_ROOT = "data/lgd";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

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

function file(folder) {
  return path.join(LGD_ROOT, folder, `${folder}-${STATE}.xls`);
}

function readRows(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: false });
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
  if (!rows.length) return;

  console.log(`${APPLY ? "IMPORT" : "DRY"} ${table}:`, rows.length);

  if (!APPLY) return;

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: conflict });

    if (error) throw error;
  }
}

function stateFromBlockVillage() {
  const rows = readRows(file("block-covered-villages"));
  const h = findHeader(rows, ["state code", "state name"]);
  const data = rows.slice(h + 1).find((r) => toInt(r[0]) && clean(r[1]));

  return {
    lgd_state_code: toInt(data[0]),
    name_en: clean(data[1]),
    slug: slugify(data[1]),
    source: "LGD",
  };
}

function districts(stateCode) {
  const rows = readRows(file("districts"));
  const h = findHeader(rows, ["district code", "district name"]);

  return rows
    .slice(h + 1)
    .map((r) => ({
      lgd_district_code: toInt(r[1]),
      lgd_state_code: stateCode,
      district_version: toInt(r[2]),
      name_en: clean(r[3]),
      name_local: clean(r[4]) || null,
      census_2001_code: clean(r[5]) || null,
      census_2011_code: clean(r[6]) || null,
      slug: slugify(r[3]),
      source: "LGD",
    }))
    .filter((r) => r.lgd_district_code && r.name_en && !r.name_en.includes("("));
}

function subdistricts() {
  const rows = readRows(file("subdistricts"));
  const h = findHeader(rows, ["subdistrict code", "district code"]);

  return rows
    .slice(h + 1)
    .map((r) => ({
      lgd_district_code: toInt(r[1]),
      lgd_subdistrict_code: toInt(r[3]),
      subdistrict_version: toInt(r[4]),
      name_en: clean(r[5]),
      name_local: clean(r[6]) || null,
      census_2001_code: clean(r[7]) || null,
      census_2011_code: clean(r[8]) || null,
      slug: slugify(r[5]),
      source: "LGD",
    }))
    .filter((r) => r.lgd_district_code && r.lgd_subdistrict_code && r.name_en && !r.name_en.includes("("));
}

function blocks() {
  const rows = readRows(file("blocks"));
  const h = findHeader(rows, ["block code", "district code"]);

  return rows
    .slice(h + 1)
    .map((r) => ({
      lgd_district_code: toInt(r[1]),
      lgd_block_code: toInt(r[3]),
      block_version: toInt(r[4]),
      name_en: clean(r[5]),
      name_local: clean(r[6]) || null,
      slug: slugify(r[5]),
      source: "LGD",
    }))
    .filter((r) => r.lgd_district_code && r.lgd_block_code && r.name_en && !r.name_en.includes("("));
}

async function main() {
  const state = stateFromBlockVillage();

  console.log("G6-D1 West Bengal top hierarchy");
  console.log("Mode:", APPLY ? "APPLY" : "DRY RUN");
  console.log("State:", state);

  await upsert("geo_lgd_states", [state], "lgd_state_code");
  await upsert("geo_lgd_districts", districts(state.lgd_state_code), "lgd_district_code");
  await upsert("geo_lgd_subdistricts", subdistricts(), "lgd_subdistrict_code");
  await upsert("geo_lgd_blocks", blocks(), "lgd_block_code");

  console.log("Done.");
}

main().catch((err) => {
  console.error("IMPORT FAILED:", err);
  process.exit(1);
});