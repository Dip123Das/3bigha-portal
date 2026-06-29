import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const LGD_ROOT = "data/lgd";
const LOG_DIR = "data/lgd/logs";
fs.mkdirSync(LOG_DIR, { recursive: true });

function readRows(file) {
  const wb = XLSX.readFile(file, { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
}

function clean(v) {
  return String(v ?? "").trim();
}

function toInt(v) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function slugify(v) {
  return clean(v)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findHeader(rows, requiredWords) {
  let best = 0;
  let bestScore = -1;

  rows.slice(0, 20).forEach((row, index) => {
    const text = row.map(clean).join(" ").toLowerCase();
    const score = requiredWords.reduce(
      (sum, word) => sum + (text.includes(word) ? 1 : 0),
      0
    );

    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });

  return best;
}

function mapRows(file, requiredWords) {
  const rows = readRows(file);
  const headerIndex = findHeader(rows, requiredWords);
  const headers = rows[headerIndex].map((h) =>
    clean(h).toLowerCase().replace(/\s+/g, " ")
  );

  return rows.slice(headerIndex + 1)
    .filter((row) => row.some((cell) => clean(cell)))
    .map((row) => ({ headers, row }));
}

const ONLY_STATE = process.env.LGD_STATE || "west-bengal";

function filesIn(folder) {
  return fs.readdirSync(path.join(LGD_ROOT, folder))
    .filter((f) => /\.xls[x]?$/i.test(f))
    .filter((f) => f.includes(ONLY_STATE))
    .map((f) => path.join(LGD_ROOT, folder, f))
    .sort();
}

const summary = {
  districts: 0,
  subdistricts: 0,
  blocks: 0,
  villages: 0,
  blockVillageLinks: 0,
  localBodies: 0,
  wards: 0,
};

for (const file of filesIn("districts")) {
  for (const { row } of mapRows(file, ["district code", "district name"])) {
    if (toInt(row[1]) && clean(row[3]) && !clean(row[3]).includes("(")) {
      summary.districts++;
    }
  }
}

for (const file of filesIn("subdistricts")) {
  for (const { row } of mapRows(file, ["subdistrict code", "district code"])) {
    if (toInt(row[3]) && clean(row[5]) && !clean(row[5]).includes("(")) {
      summary.subdistricts++;
    }
  }
}

for (const file of filesIn("blocks")) {
  for (const { row } of mapRows(file, ["block code", "district code"])) {
    if (toInt(row[3]) && clean(row[5]) && !clean(row[5]).includes("(")) {
      summary.blocks++;
    }
  }
}

for (const file of filesIn("villages")) {
  for (const { row } of mapRows(file, ["village code", "sub-district"])) {
    if (toInt(row[5]) && clean(row[7]) && !clean(row[7]).includes("(")) {
      summary.villages++;
    }
  }
}

for (const file of filesIn("block-covered-villages")) {
  for (const { row } of mapRows(file, ["block code", "village code"])) {
    if (toInt(row[4]) && toInt(row[6])) {
      summary.blockVillageLinks++;
    }
  }
}

for (const folder of ["pri-local-bodies", "urban-local-bodies", "town-local-bodies"]) {
  for (const file of filesIn(folder)) {
    for (const { row } of mapRows(file, ["localbody code", "localbody name"])) {
      if (toInt(row[3]) || toInt(row[1])) {
        summary.localBodies++;
      }
    }
  }
}

for (const folder of ["pri-wards", "urban-local-body-wards", "urban-local-body-wards-covered"]) {
  if (!fs.existsSync(path.join(LGD_ROOT, folder))) continue;

  for (const file of filesIn(folder)) {
    for (const { row } of mapRows(file, ["ward code", "ward name"])) {
      if (toInt(row[6]) || toInt(row[3])) {
        summary.wards++;
      }
    }
  }
}

fs.writeFileSync(
  path.join(LOG_DIR, "g6-national-address-dry-run.json"),
  JSON.stringify(summary, null, 2)
);

console.log("G6 National Address Engine dry-run complete");
console.log(summary);