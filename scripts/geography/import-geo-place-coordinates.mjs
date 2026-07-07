import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const FILE = process.argv[2] || "data/geography/coordinates/import/geo-place-coordinate-import.json";
const APPLY = process.argv.includes("--apply");
const BATCH_SIZE = 500;

const rows = JSON.parse(fs.readFileSync(FILE, "utf8"));

function valid(r) {
  const lat = Number(r.latitude);
  const lng = Number(r.longitude);
  return r.geo_place_id && Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}

const validRows = rows.filter(valid);

console.log({
  file: FILE,
  totalRows: rows.length,
  validRows: validRows.length,
  mode: APPLY ? "APPLY" : "DRY_RUN"
});

if (!APPLY) {
  console.log("Dry run only. Add --apply to update geo_places.");
  console.log("Sample:", validRows.slice(0, 3));
  process.exit(0);
}

let updated = 0;
let failed = 0;

for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
  const batch = validRows.slice(i, i + BATCH_SIZE);

  for (const r of batch) {
    const { error } = await supabase
      .from("geo_places")
      .update({
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        is_verified: false
      })
      .eq("id", r.geo_place_id);

    if (error) {
      failed++;
      console.error("Failed:", r.geo_place_id, error.message);
    } else {
      updated++;
    }
  }

  console.log(`Progress: ${updated}/${validRows.length}, failed=${failed}`);
}

console.log("Import completed");
console.log({ updated, failed });
