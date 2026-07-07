import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const OUT = "data/geography/coordinates/raw/geo-place-coordinate-candidates.json";
const TMP = OUT + ".tmp";
const PAGE_SIZE = 5000;

fs.mkdirSync(path.dirname(OUT), { recursive: true });

const selected = [
  "id",
  "name",
  "slug",
  "pincode",
  "latitude",
  "longitude",
  "district_id",
  "subdivision_id",
  "block_id",
  "lgd_code"
];

const stream = fs.createWriteStream(TMP, { encoding: "utf8" });
stream.write("[\n");

let total = 0;
let first = true;
let lastId = null;

while (true) {
  let query = supabase
    .from("geo_places")
    .select(selected.join(","))
    .or("latitude.is.null,longitude.is.null")
    .order("id", { ascending: true })
    .limit(PAGE_SIZE);

  if (lastId) query = query.gt("id", lastId);

  const { data, error } = await query;
  if (error) {
    console.error("Export failed:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) break;

  for (const p of data) {
    const row = {
      geo_place_id: p.id,
      name: p.name || null,
      slug: p.slug || null,
      pincode: p.pincode || null,
      district_id: p.district_id || null,
      subdivision_id: p.subdivision_id || null,
      block_id: p.block_id || null,
      lgd_code: p.lgd_code || null,
      current_latitude: p.latitude || null,
      current_longitude: p.longitude || null
    };

    if (!first) stream.write(",\n");
    stream.write(JSON.stringify(row));
    first = false;
    total++;
  }

  lastId = data[data.length - 1].id;
  console.log(`Exported: ${total}`);
}

stream.write("\n]\n");
stream.end();
await new Promise((resolve) => stream.on("finish", resolve));

fs.renameSync(TMP, OUT);
console.log(`Done. Wrote ${total} rows to ${OUT}`);
