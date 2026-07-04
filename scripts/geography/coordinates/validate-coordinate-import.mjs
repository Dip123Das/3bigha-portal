import fs from "fs";
import path from "path";

const inputFile = process.argv[2];

if (!inputFile) {
  console.error("Usage: node scripts/geography/coordinates/validate-coordinate-import.mjs <import.json>");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(path.resolve(inputFile), "utf8"));

if (!Array.isArray(rows)) {
  console.error("Input must be a JSON array.");
  process.exit(1);
}

const counts = {};
const invalid = [];

for (const row of rows) {
  counts[row.entity_type] = (counts[row.entity_type] || 0) + 1;

  const lat = Number(row.latitude);
  const lng = Number(row.longitude);

  if (
    !row.entity_type ||
    !row.entity_id ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    invalid.push(row);
  }
}

console.log("Coordinate Import Validation");
console.log("============================");
console.log(`Total rows: ${rows.length}`);
console.log(`Invalid rows: ${invalid.length}`);
console.log("");

console.log("Rows by entity type:");
for (const [type, count] of Object.entries(counts).sort()) {
  console.log(`- ${type}: ${count}`);
}

if (invalid.length) {
  const invalidFile = inputFile.replace(/\.json$/i, ".invalid.json");
  fs.writeFileSync(path.resolve(invalidFile), JSON.stringify(invalid, null, 2));
  console.log("");
  console.log(`Invalid rows written to: ${invalidFile}`);
  process.exit(1);
}
