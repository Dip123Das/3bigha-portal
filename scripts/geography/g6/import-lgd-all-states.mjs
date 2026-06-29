import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
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

function titleFromFile(file) {
  const name = path.basename(file)
    .replace(/\.xls[x]?$/i, "")
    .replace(/^(districts|block-covered-villages)-/i, "")
    .replace(/-/g, " ");

  return name.replace(/\b\w/g, (m) => m.toUpperCase());
}

function slugify(v) {
  return clean(v)
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStateName(name) {
  return clean(name)
    .replace(/^The\s+/i, "")
    .replace(/\bAnd\b/g, "and")
    .replace(/\s+/g, " ");
}

function readRows(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
}

function filesIn(folder) {
  return fs
    .readdirSync(path.join(LGD_ROOT, folder))
    .filter((f) => /\.xls[x]?$/i.test(f))
    .map((f) => path.join(LGD_ROOT, folder, f))
    .sort();
}

function stateFromBlockCovered(file) {
  const rows = readRows(file);

  for (const r of rows) {
    const code = toInt(r[0]);
    const name = normalizeStateName(r[1]);

    if (code && name && !name.toLowerCase().includes("state name")) {
      return {
        lgd_state_code: code,
        name_en: name,
        slug: slugify(name),
        source: "LGD",
      };
    }
  }

  return null;
}

function stateFromDistrictTitle(file) {
  const rows = readRows(file);
  const title = clean(rows?.[0]?.[0]);

  const codeMatch = title.match(/State\s*Code\s*:\s*(\d+)/i);
  if (!codeMatch) return null;

  let name = title
    .replace(/^All Districts of\s+/i, "")
    .replace(/\(State\s*Code\s*:\s*\d+\)\s*State.*$/i, "")
    .trim();

  if (!name) name = titleFromFile(file);

  name = normalizeStateName(name);

  return {
    lgd_state_code: Number(codeMatch[1]),
    name_en: name,
    slug: slugify(name),
    source: "LGD",
  };
}

function states() {
  const map = new Map();

  for (const file of filesIn("block-covered-villages")) {
    const state = stateFromBlockCovered(file);
    if (state) map.set(state.lgd_state_code, state);
  }

  for (const file of filesIn("districts")) {
    const state = stateFromDistrictTitle(file);
    if (state) map.set(state.lgd_state_code, state);
  }

  return [...map.values()].sort((a, b) => a.name_en.localeCompare(b.name_en));
}

async function main() {
  const rows = states();

  console.log("G6 import all LGD states");
  console.log("Mode:", APPLY ? "APPLY" : "DRY RUN");
  console.log("States:", rows.length);
  console.table(rows);

  if (!APPLY) return;

  const { error } = await supabase
    .from("geo_lgd_states")
    .upsert(rows, { onConflict: "lgd_state_code" });

  if (error) throw error;

  console.log("Done.");
}

main().catch((err) => {
  console.error("STATE IMPORT FAILED:", err);
  process.exit(1);
});