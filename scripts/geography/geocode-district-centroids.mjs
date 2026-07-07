import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const OUT = "data/geography/coordinates/normalized/india-district-coordinates-normalized.json";
const CACHE = "data/geography/coordinates/raw/district-geocode-cache.json";

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.mkdirSync(path.dirname(CACHE), { recursive: true });

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function valid(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}

async function geocode(query) {
  if (cache[query]) return cache[query];

  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=" +
    encodeURIComponent(query);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "3bigha-national-coordinate-activation/1.0 admin@3bigha.com"
    }
  });

  const data = await res.json();
  cache[query] = data?.[0] || null;
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));

  await sleep(1300);
  return cache[query];
}

const { data: districts, error } = await supabase
  .from("geo_districts")
  .select("id,name,slug,lgd_code,state_id,geo_states(name)")
  .order("name", { ascending: true });

if (error) throw error;

const rows = [];

for (const d of districts || []) {
  const stateName = d.geo_states?.name || "";
  const query = `${d.name} district, ${stateName}, India`;

  console.log("Geocoding:", query);

  const hit = await geocode(query);
  const lat = Number(hit?.lat);
  const lng = Number(hit?.lon);

  if (valid(lat, lng)) {
    rows.push({
      district_id: d.id,
      state_id: d.state_id,
      lgd_code: d.lgd_code,
      name: d.name,
      state: stateName,
      latitude: lat,
      longitude: lng,
      source: "nominatim_district_centroid",
      query
    });
  }
}

fs.writeFileSync(OUT, JSON.stringify(rows, null, 2));

console.log("Done");
console.log({
  districts: districts.length,
  geocoded: rows.length,
  output: OUT,
  cache: CACHE
});
