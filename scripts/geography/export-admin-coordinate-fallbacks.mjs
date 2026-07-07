import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const OUT_DIR = "data/geography/coordinates/normalized";
fs.mkdirSync(OUT_DIR, { recursive: true });

async function exportTable(table, select, outFile, mapRow) {
  let rows = [];
  let lastId = null;

  while (true) {
    let q = supabase.from(table).select(select).order("id", { ascending: true }).limit(5000);
    if (lastId) q = q.gt("id", lastId);

    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;

    for (const r of data) {
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) rows.push(mapRow(r, lat, lng));
    }

    lastId = data[data.length - 1].id;
  }

  fs.writeFileSync(path.join(OUT_DIR, outFile), JSON.stringify(rows, null, 2));
  console.log(`${outFile}: ${rows.length}`);
}

await exportTable(
  "geo_blocks",
  "id,name,slug,lgd_code,district_id,subdivision_id,latitude,longitude",
  "india-block-coordinates-normalized.json",
  (r, lat, lng) => ({
    block_id: r.id,
    district_id: r.district_id,
    subdivision_id: r.subdivision_id,
    lgd_code: r.lgd_code,
    name: r.name,
    latitude: lat,
    longitude: lng
  })
);

await exportTable(
  "geo_subdivisions",
  "id,name,slug,lgd_code,district_id,latitude,longitude",
  "india-subdivision-coordinates-normalized.json",
  (r, lat, lng) => ({
    subdivision_id: r.id,
    district_id: r.district_id,
    lgd_code: r.lgd_code,
    name: r.name,
    latitude: lat,
    longitude: lng
  })
);

await exportTable(
  "geo_districts",
  "id,name,slug,lgd_code,state_id,latitude,longitude",
  "india-district-coordinates-normalized.json",
  (r, lat, lng) => ({
    district_id: r.id,
    state_id: r.state_id,
    lgd_code: r.lgd_code,
    name: r.name,
    latitude: lat,
    longitude: lng
  })
);

await exportTable(
  "geo_states",
  "id,name,slug,lgd_code,latitude,longitude",
  "india-state-coordinates-normalized.json",
  (r, lat, lng) => ({
    state_id: r.id,
    lgd_code: r.lgd_code,
    name: r.name,
    latitude: lat,
    longitude: lng
  })
);
