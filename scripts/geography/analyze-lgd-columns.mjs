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
];

function norm(v) {
  return String(v || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function readRows(file) {
  const wb = XLSX.readFile(file, { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const headerIndex = raw.findIndex((row) =>
    row.filter((cell) => String(cell || "").trim()).length >= 2
  );

  if (headerIndex < 0) return { headers: [], rows: [] };

  const headers = raw[headerIndex].map((h) => norm(h));
  const rows = raw
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        if (!h) return;
        const key = obj[h] === undefined ? h : `${h}__${i}`;
        obj[key] = String(row[i] || "").trim();
      });
      return obj;
    });

  return { headers, rows };
}

function pickHeader(headers, candidates) {
  return headers.find((h) =>
    candidates.some((c) => h === norm(c) || h.includes(norm(c)))
  ) || null;
}

const expected = {
  districts: {
    code: ["district code"],
    name: ["district name"],
  },
  subdistricts: {
    districtCode: ["district code"],
    districtName: ["district name"],
    code: ["subdistrict code", "sub-district code"],
    name: ["subdistrict name", "sub-district name"],
  },
  blocks: {
    districtCode: ["district code"],
    districtName: ["district name"],
    code: ["block code"],
    name: ["block name"],
  },
  villages: {
    districtCode: ["district code"],
    districtName: ["district name"],
    subdistrictCode: ["sub-district code", "subdistrict code"],
    subdistrictName: ["sub-district name", "subdistrict name"],
    code: ["village code"],
    name: ["village name"],
  },
  "urban-local-bodies": {
    typeCode: ["localbody type code", "local body type code"],
    typeName: ["localbody type name", "local body type name"],
    code: ["localbody code", "local body code"],
    name: ["local body name", "localbody name"],
  },
  "town-local-bodies": {
    code: ["local body code"],
    typeName: ["local body type name", "local bod y type name"],
    name: ["local body name"],
    parentCode: ["parent localbody code"],
  },
  "block-covered-villages": {
    stateCode: ["state code"],
    stateName: ["state name"],
    districtCode: ["district code"],
    districtName: ["district name"],
    blockCode: ["block code"],
    blockName: ["block name"],
    villageCode: ["village code"],
    villageName: ["village name"],
  },
  "village-gram-panchayat-mapping": {
    districtCode: ["district code"],
    districtName: ["district name"],
    subdistrictCode: ["subdistrict code"],
    subdistrictName: ["subdistrict name"],
    villageCode: ["village code"],
    villageName: ["village name"],
  },
};

const report = [];

for (const folder of folders) {
  const full = path.join(ROOT, folder);
  const files = fs.readdirSync(full).filter((f) => /\.(xls|xlsx|csv)$/i.test(f)).sort();

  let totalRows = 0;
  const uniqueHeaders = new Map();
  const sampleMappings = [];

  for (const fileName of files) {
    const file = path.join(full, fileName);
    const { headers, rows } = readRows(file);
    totalRows += rows.length;

    const key = headers.join(" | ");
    uniqueHeaders.set(key, (uniqueHeaders.get(key) || 0) + 1);

    if (sampleMappings.length < 3) {
      const map = {};
      for (const [field, candidates] of Object.entries(expected[folder] || {})) {
        map[field] = pickHeader(headers, candidates);
      }

      sampleMappings.push({
        fileName,
        rows: rows.length,
        headers,
        mapping: map,
        sample: rows[0] || null,
      });
    }
  }

  report.push({
    folder,
    files: files.length,
    totalRows,
    uniqueHeaderPatterns: uniqueHeaders.size,
    headers: [...uniqueHeaders.entries()].map(([header, count]) => ({ count, header })),
    sampleMappings,
  });
}

const out = path.join(ROOT, "logs", "lgd-column-analysis.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");

console.log("LGD column analysis complete:", out);
for (const item of report) {
  console.log(`\n${item.folder}: files=${item.files}, rows=${item.totalRows}, headerPatterns=${item.uniqueHeaderPatterns}`);
  for (const sample of item.sampleMappings) {
    console.log(`  - ${sample.fileName}: rows=${sample.rows}`);
    console.log("    mapping:", JSON.stringify(sample.mapping));
  }
}
