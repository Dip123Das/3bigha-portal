import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const root = "data/lgd";
const outDir = "data/lgd/logs";
const outJson = path.join(outDir, "lgd-g6-dataset-map.json");

fs.mkdirSync(outDir, { recursive: true });

function walk(dir) {
  const out = [];
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...walk(p));
    else if (/\.(xls|xlsx|csv)$/i.test(item)) out.push(p);
  }
  return out;
}

function datasetName(file) {
  return file.split(path.sep)[2] || "unknown";
}

function findHeader(rows) {
  let bestIndex = 0;
  let bestScore = -1;

  rows.slice(0, 20).forEach((row, index) => {
    const cells = row.map((cell) => String(cell || "").toLowerCase().trim());

    const score = cells.reduce((sum, v) => {
      if (!v) return sum;
      if (v.includes("code")) return sum + 3;
      if (v.includes("name")) return sum + 3;
      if (v.includes("version")) return sum + 2;
      if (v.includes("district")) return sum + 2;
      if (v.includes("subdistrict")) return sum + 2;
      if (v.includes("block")) return sum + 2;
      if (v.includes("village")) return sum + 2;
      if (v.includes("local body")) return sum + 2;
      if (v.includes("ward")) return sum + 2;
      return sum;
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

const files = walk(root).sort();
const grouped = {};

for (const file of files) {
  const group = datasetName(file);

  if (!grouped[group]) {
    grouped[group] = {
      dataset: group,
      file_count: 0,
      files: [],
      sample: null,
    };
  }

  grouped[group].file_count += 1;
  grouped[group].files.push(file);

  if (!grouped[group].sample) {
    try {
      const wb = XLSX.readFile(file, { cellDates: false });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
      });

      const headerIndex = findHeader(rows);
      const h = headerIndex >= 0 ? headerIndex : 0;

      grouped[group].sample = {
        file,
        sheet: sheetName,
        rows: rows.length,
        header_row: h + 1,
        headers: rows[h] || [],
        sample_1: rows[h + 1] || [],
        sample_2: rows[h + 2] || [],
      };
    } catch (e) {
      grouped[group].sample = {
        file,
        error: e.message,
      };
    }
  }
}

const result = Object.values(grouped).sort((a, b) =>
  a.dataset.localeCompare(b.dataset)
);

fs.writeFileSync(outJson, JSON.stringify(result, null, 2));

console.log("G6 LGD DATASET MAP");
console.log("==================");
console.log("Total files:", files.length);
console.log("Dataset groups:", result.length);
console.log("");

for (const item of result) {
  console.log("DATASET:", item.dataset);
  console.log("Files:", item.file_count);

  if (item.sample?.error) {
    console.log("ERROR:", item.sample.error);
  } else {
    console.log("Sample file:", item.sample.file);
    console.log("Rows:", item.sample.rows);
    console.log("Header row:", item.sample.header_row);
    console.log("Headers:", JSON.stringify(item.sample.headers));
  }

  console.log("");
}

console.log("JSON written to:", outJson);