import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { getSupabase } from "./lgd-import-utils.mjs";

const inputFile = process.argv[2];

if (!inputFile) {
  console.error("Usage: node scripts/geography/import-india-post-pincodes.mjs <csv-or-xlsx-file>");
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

const supabase = getSupabase();

function clean(v) {
  return String(v ?? "").trim();
}

function normHeader(v) {
  return clean(v).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function pick(row, names) {
  for (const name of names) {
    if (row[name] != null && clean(row[name]) !== "") return clean(row[name]);
  }
  return "";
}

function readRows(file) {
  const ext = path.extname(file).toLowerCase();

  if (ext === ".csv") {
    const text = fs.readFileSync(file, "utf8");
    const wb = XLSX.read(text, { type: "string" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: "" });
  }

  const wb = XLSX.readFile(file, { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function normalizeRows(rawRows) {
  return rawRows.map((row) => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      out[normHeader(key)] = value;
    }
    return out;
  });
}

function toRow(row) {
  const pincode = pick(row, [
    "pincode",
    "pin_code",
    "pin",
    "office_pincode",
    "postal_code",
  ]).replace(/\D/g, "");

  if (!/^\d{6}$/.test(pincode)) return null;

  return {
    pincode,
    circle_name: pick(row, ["circle_name", "circle"]),
    region_name: pick(row, ["region_name", "region"]),
    division_name: pick(row, ["division_name", "division"]),
    office_name: pick(row, ["office_name", "officename", "post_office_name", "name"]),
    office_type: pick(row, ["office_type", "officetype"]),
    delivery_status: pick(row, ["delivery_status", "deliverystatus", "delivery"]),
    district_name: pick(row, ["district_name", "district"]),
    state_name: pick(row, ["state_name", "state"]),
    latitude: Number(pick(row, ["latitude", "lat"])) || null,
    longitude: Number(pick(row, ["longitude", "lng", "lon"])) || null,
    source: "india_post",
    updated_at: new Date().toISOString(),
  };
}

async function upsertChunks(table, rows, conflict) {
  let total = 0;

  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000);

    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: conflict });

    if (error) throw new Error(`${table} upsert failed: ${error.message}`);

    total += chunk.length;
    console.log(`${table}: ${total}/${rows.length}`);
  }

  return total;
}

const rawRows = readRows(inputFile);
const normalized = normalizeRows(rawRows);

console.log(`Read rows: ${normalized.length}`);

const rows = normalized.map(toRow).filter(Boolean);

const unique = Array.from(
  new Map(rows.map((r) => [r.pincode, r])).values()
);

console.log(`Valid PIN rows: ${rows.length}`);
console.log(`Unique PIN rows: ${unique.length}`);

await upsertChunks("geo_lgd_pincodes", unique, "pincode");

console.log("✅ India Post PIN import complete.");
