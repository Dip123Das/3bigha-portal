import fs from "fs";
import path from "path";

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error("Usage: node scripts/geography/coordinates/normalize-coordinate-source.mjs <input.json> <output.json>");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(path.resolve(inputFile), "utf8"));

if (!Array.isArray(rows)) {
  console.error("Input must be a JSON array.");
  process.exit(1);
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
      return row[key];
    }
  }
  return null;
}

const normalized = rows
  .map((row) => ({
    source_entity_type: pick(row, ["entity_type", "type", "level"]),
    source_code: pick(row, ["lgd_code", "code", "entity_code"]),
    source_name: pick(row, ["name", "entity_name", "place_name"]),
    latitude: Number(pick(row, ["latitude", "lat"])),
    longitude: Number(pick(row, ["longitude", "lng", "lon"])),
    raw: row,
  }))
  .filter((row) =>
    row.source_entity_type &&
    row.source_name &&
    Number.isFinite(row.latitude) &&
    Number.isFinite(row.longitude)
  );

fs.writeFileSync(path.resolve(outputFile), JSON.stringify(normalized, null, 2));

console.log(`Normalized ${normalized.length}/${rows.length} rows.`);
