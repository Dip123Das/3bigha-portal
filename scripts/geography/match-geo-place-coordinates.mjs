import fs from "fs";
import path from "path";

const CANDIDATES = "data/geography/coordinates/raw/geo-place-coordinate-candidates.json";
const OUT = "data/geography/coordinates/import/geo-place-coordinate-import.json";

const SOURCES = [
  ["block", "data/geography/coordinates/normalized/india-block-coordinates-normalized.json", "block_id"],
  ["subdivision", "data/geography/coordinates/normalized/india-subdivision-coordinates-normalized.json", "subdivision_id"],
  ["district", "data/geography/coordinates/normalized/india-district-coordinates-normalized.json", "district_id"]
];

function read(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
}

function coord(row) {
  let lat = Number(row.latitude);
  let lng = Number(row.longitude);

  if (lat >= 68 && lat <= 98 && lng >= 6 && lng <= 38) {
    [lat, lng] = [lng, lat];
  }

  if (lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98) {
    return { latitude: lat, longitude: lng };
  }

  return null;
}

function indexSource(name, file, keyName) {
  const rows = read(file);
  const map = new Map();
  let bad = 0;
  let noKey = 0;

  for (const r of rows) {
    const key = r[keyName];
    if (!key) {
      noKey++;
      continue;
    }

    const c = coord(r);
    if (!c) {
      bad++;
      continue;
    }

    map.set(String(key), {
      ...c,
      coordinate_source: name,
      coordinate_source_key: String(key)
    });
  }

  console.log(`${name}: rows=${rows.length}, indexed=${map.size}, noKey=${noKey}, badCoord=${bad}`);
  return map;
}

const candidates = read(CANDIDATES);
const indexes = SOURCES.map(([name, file, key]) => ({
  name,
  key,
  map: indexSource(name, file, key)
}));

const matched = [];
const unmatched = [];

for (const p of candidates) {
  let hit = null;

  for (const s of indexes) {
    const key = p[s.key];
    if (!key) continue;
    hit = s.map.get(String(key));
    if (hit) break;
  }

  if (hit) {
    matched.push({
      geo_place_id: p.geo_place_id,
      latitude: hit.latitude,
      longitude: hit.longitude,
      coordinate_source: hit.coordinate_source,
      coordinate_source_key: hit.coordinate_source_key,
      lgd_code: p.lgd_code,
      name: p.name,
      slug: p.slug
    });
  } else {
    unmatched.push({
      geo_place_id: p.geo_place_id,
      name: p.name,
      slug: p.slug,
      lgd_code: p.lgd_code,
      district_id: p.district_id,
      subdivision_id: p.subdivision_id,
      block_id: p.block_id
    });
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(matched, null, 2));
fs.writeFileSync(OUT.replace(".json", ".unmatched.json"), JSON.stringify(unmatched.slice(0, 50000), null, 2));

const bySource = matched.reduce((a, r) => {
  a[r.coordinate_source] = (a[r.coordinate_source] || 0) + 1;
  return a;
}, {});

console.log("\nMatch completed");
console.log({
  candidates: candidates.length,
  matched: matched.length,
  unmatched: unmatched.length,
  bySource,
  output: OUT
});
