import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const ROOT = "data/lgd";

const folders = [
  "districts",
  "subdistricts",
  "blocks",
  "villages",
  "urban-local-bodies",
  "town-local-bodies",
  "block-covered-villages",
  "village-gram-panchayat-mapping",
  "pri-local-bodies",
  "pri-wards",
  "urban-local-body-wards",
  "urban-local-body-wards-covered",
];

function readHeader(file) {
  try {
    const workbook = XLSX.readFile(file, { cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const firstUseful = rows.find((row) =>
      row.filter((cell) => String(cell || "").trim()).length >= 2
    );
    return firstUseful ? firstUseful.map((x) => String(x || "").trim()).filter(Boolean) : [];
  } catch (error) {
    return [`ERROR: ${error.message}`];
  }
}

const report = [];

for (const folder of folders) {
  const full = path.join(ROOT, folder);
  if (!fs.existsSync(full)) {
    report.push({ folder, count: 0, files: [], missingFolder: true });
    continue;
  }

  const files = fs
    .readdirSync(full)
    .filter((name) => /\.(xls|xlsx|csv)$/i.test(name))
    .sort();

  const samples = files.slice(0, 3).map((name) => {
    const file = path.join(full, name);
    return {
      name,
      header: readHeader(file),
    };
  });

  report.push({
    folder,
    count: files.length,
    samples,
  });
}

const out = path.join(ROOT, "logs", "lgd-scan-report.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");

console.log("LGD scan complete:", out);
for (const item of report) {
  console.log(`${item.folder}: ${item.count}`);
  for (const sample of item.samples || []) {
    console.log("  -", sample.name);
    console.log("    header:", sample.header.slice(0, 12).join(" | "));
  }
}
