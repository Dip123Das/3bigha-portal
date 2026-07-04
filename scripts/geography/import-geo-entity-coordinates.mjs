import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const inputFile = process.argv[2];

if (!inputFile) {
  console.error("Usage: node scripts/geography/import-geo-entity-coordinates.mjs <file.json>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const entityTables = {
  state: "geo_states",
  district: "geo_districts",
  subdivision: "geo_subdivisions",
  block: "geo_blocks",
  place: "geo_places",
};

function isValidLatLng(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

const fullPath = path.resolve(inputFile);
const rows = JSON.parse(fs.readFileSync(fullPath, "utf8"));

if (!Array.isArray(rows)) {
  console.error("Input JSON must be an array.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

let updated = 0;
let skipped = 0;

for (const row of rows) {
  const entityType = String(row.entity_type || "").trim().toLowerCase();
  const table = entityTables[entityType];
  const id = row.entity_id ? String(row.entity_id) : "";
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);

  if (!table || !id || !isValidLatLng(latitude, longitude)) {
    skipped++;
    continue;
  }

  const { error } = await supabase
    .from(table)
    .update({ latitude, longitude })
    .eq("id", id);

  if (error) {
    console.error(`Failed ${entityType} ${id}:`, error.message);
    skipped++;
    continue;
  }

  updated++;
}

console.log(`Coordinate import completed. Updated: ${updated}. Skipped: ${skipped}.`);
