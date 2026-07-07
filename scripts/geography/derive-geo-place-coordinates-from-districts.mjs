import fs from "fs";
import path from "path";

const CANDIDATES = "data/geography/coordinates/raw/geo-place-coordinate-candidates.json";
const DISTRICTS = "data/geography/coordinates/normalized/india-district-coordinates-normalized.json";
const OUT = "data/geography/coordinates/import/geo-place-coordinate-import.json";
const UNMATCHED = "data/geography/coordinates/import/geo-place-coordinate-import.unmatched.json";

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function validCoord(r) {
  const lat = Number(r.latitude);
  const lng = Number(r.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}

const candidates = readJson(CANDIDATES);
const districts = readJson(DISTRICTS);

const districtIndex = new Map();

for (const d of districts) {
  if (!d.district_id || !validCoord(d)) continue;

  districtIndex.set(String(d.district_id), {
    latitude: Number(d.latitude),
    longitude: Number(d.longitude),
    district_name: d.name || null,
    state_name: d.state || null
  });
}

const matched = [];
const unmatched = [];

for (const p of candidates) {
  const d = p.district_id ? districtIndex.get(String(p.district_id)) : null;

  if (d) {
    matched.push({
      geo_place_id: p.geo_place_id,
      latitude: d.latitude,
      longitude: d.longitude,
      coordinate_source: "derived_district_centroid",
      coordinate_precision: "district",
      coordinate_source_key: p.district_id,
      district_name: d.district_name,
      state_name: d.state_name,
      lgd_code: p.lgd_code || null,
      name: p.name || null,
      slug: p.slug || null
    });
  } else {
    unmatched.push({
      geo_place_id: p.geo_place_id,
      name: p.name || null,
      slug: p.slug || null,
      lgd_code: p.lgd_code || null,
      district_id: p.district_id || null
    });
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(matched, null, 2));
fs.writeFileSync(UNMATCHED, JSON.stringify(unmatched, null, 2));

console.log("Derived coordinate import completed");
console.log({
  candidates: candidates.length,
  districtCoordinateSources: districtIndex.size,
  matched: matched.length,
  unmatched: unmatched.length,
  output: OUT,
  unmatchedOutput: UNMATCHED
});

console.log("Sample matched:");
console.log(matched.slice(0, 3));

console.log("Sample unmatched:");
console.log(unmatched.slice(0, 10));
