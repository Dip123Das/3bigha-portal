import fs from "fs";
import XLSX from "xlsx";

const files = [
  "data/lgd/districts/districts-west-bengal.xls",
  "data/lgd/subdistricts/subdistricts-west-bengal.xls",
  "data/lgd/blocks/blocks-west-bengal.xls",
  "data/lgd/block-covered-villages/block-covered-villages-west-bengal.xls",
  "data/lgd/villages/villages-west-bengal.xls",
  "data/lgd/urban-local-bodies/urban-local-bodies-west-bengal.xls",
  "data/lgd/town-local-bodies/town-local-bodies-west-bengal.xls",
  "data/lgd/urban-local-body-wards/urban-local-body-wards-west-bengal.xls",
  "data/lgd/urban-local-body-wards-covered/urban-local-body-wards-covered-west-bengal.xls",
  "data/lgd/pri-local-bodies/pri-local-bodies-west-bengal.xls",
  "data/lgd/pri-wards/pri-wards-west-bengal.xls",
];

for (const file of files) {
  console.log("\n===== " + file + " =====");
  if (!fs.existsSync(file)) {
    console.log("MISSING");
    continue;
  }

  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  console.log("Sheets:", wb.SheetNames.join(", "));
  console.log("Rows:", rows.length);

  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => String(cell).toLowerCase().includes("code")) &&
    row.some((cell) => String(cell).toLowerCase().includes("name"))
  );

  const start = headerIndex >= 0 ? headerIndex : 0;
  console.log("Header row:", start + 1);
  console.log("Headers:", JSON.stringify(rows[start]));
  console.log("Sample 1:", JSON.stringify(rows[start + 1]));
  console.log("Sample 2:", JSON.stringify(rows[start + 2]));
}
