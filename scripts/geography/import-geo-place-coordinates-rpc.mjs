import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const FILE = process.argv[2] || "data/geography/coordinates/import/geo-place-coordinate-import.json";
const APPLY = process.argv.includes("--apply");
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 100);

const rows = JSON.parse(fs.readFileSync(FILE, "utf8"));

function valid(r) {
  const lat = Number(r.latitude);
  const lng = Number(r.longitude);
  return r.geo_place_id && Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}

const validRows = rows.filter(valid).map((r) => ({
  geo_place_id: r.geo_place_id,
  latitude: Number(r.latitude),
  longitude: Number(r.longitude)
}));

console.log({
  file: FILE,
  totalRows: rows.length,
  validRows: validRows.length,
  mode: APPLY ? "APPLY" : "DRY_RUN",
  batchSize: BATCH_SIZE
});

if (!APPLY) {
  console.log("Dry run only. Add --apply to update geo_places via RPC.");
  console.log(validRows.slice(0, 3));
  process.exit(0);
}

let updated = 0;

for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
  const batch = validRows.slice(i, i + BATCH_SIZE);

  const { data, error } = await supabase.rpc("import_geo_place_coordinates_batch", {
    payload: batch
  });

  if (error) {
    console.error("Batch failed at", i, error.message);
    process.exit(1);
  }

  updated += Number(data || 0);
  console.log(`Progress: ${Math.min(i + BATCH_SIZE, validRows.length)}/${validRows.length}, updated=${updated}`);
}

console.log("RPC import completed");
console.log({ updated });
