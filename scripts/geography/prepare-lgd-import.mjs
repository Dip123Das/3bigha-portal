import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const ROOT = "data/lgd";

function norm(v) {
  return String(v || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function slug(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stateSlugFromFile(name, prefix) {
  return name
    .replace(/\.xlsx?$/i, "")
    .replace(new RegExp(`^${prefix}-`, "i"), "");
}

function readRows(file) {
  const wb = XLSX.readFile(file, { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const headerIndex = raw.findIndex((row) =>
    row.filter((cell) => String(cell || "").trim()).length >= 2
  );
  if (headerIndex < 0) return [];

  const headers = raw[headerIndex].map((h) => norm(h));
  return raw
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
}

function pick(row, names) {
  for (const name of names) {
    const n = norm(name);
    const key = Object.keys(row).find((k) => k === n || k.includes(n));
    if (key && row[key]) return row[key];
  }
  return "";
}

function readFolder(folder, prefix) {
  const dir = path.join(ROOT, folder);
  const files = fs.readdirSync(dir).filter((x) => /\.xls$/i.test(x)).sort();
  const rows = [];

  for (const file of files) {
    const stateSlug = stateSlugFromFile(file, prefix);
    const full = path.join(dir, file);
    for (const row of readRows(full)) {
      rows.push({ stateSlug, file, row });
    }
  }
  return rows;
}

const districts = readFolder("districts", "districts").map(({ stateSlug, row }) => ({
  stateSlug,
  lgdCode: pick(row, ["district code"]),
  name: pick(row, ["district name"]),
}));

const subdistricts = readFolder("subdistricts", "subdistricts").map(({ stateSlug, row }) => ({
  stateSlug,
  districtCode: pick(row, ["district code"]),
  districtName: pick(row, ["district name"]),
  lgdCode: pick(row, ["subdistrict code"]),
  name: pick(row, ["subdistrict name"]),
}));

const blocks = readFolder("blocks", "blocks").map(({ stateSlug, row }) => ({
  stateSlug,
  districtCode: pick(row, ["district code"]),
  districtName: pick(row, ["district name"]),
  lgdCode: pick(row, ["block code"]),
  name: pick(row, ["block name"]),
}));

const blockCovered = readFolder("block-covered-villages", "block-covered-villages").map(({ stateSlug, row }) => ({
  stateSlug,
  districtCode: pick(row, ["district code"]),
  blockCode: pick(row, ["block code"]),
  villageCode: pick(row, ["village code"]),
}));

const blockByVillageCode = new Map();
for (const r of blockCovered) {
  if (r.villageCode && r.blockCode) {
    blockByVillageCode.set(`${r.stateSlug}|${r.villageCode}`, r.blockCode);
  }
}

const villages = readFolder("villages", "villages").map(({ stateSlug, row }) => ({
  stateSlug,
  districtCode: pick(row, ["district code"]),
  districtName: pick(row, ["district name"]),
  subdistrictCode: pick(row, ["sub-district code", "subdistrict code"]),
  subdistrictName: pick(row, ["sub-district name", "subdistrict name"]),
  blockCode: blockByVillageCode.get(`${stateSlug}|${pick(row, ["village code"])}`) || "",
  lgdCode: pick(row, ["village code"]),
  name: pick(row, ["village name"]),
  placeType: "village",
}));

const urbanLocalBodies = readFolder("urban-local-bodies", "urban-local-bodies").map(({ stateSlug, row }) => ({
  stateSlug,
  lgdCode: pick(row, ["localbody code"]),
  name: pick(row, ["local body name", "localbody name"]),
  placeType: slug(pick(row, ["localbody type name", "local body type name"])) || "urban-local-body",
}));

const townLocalBodies = readFolder("town-local-bodies", "town-local-bodies").map(({ stateSlug, row }) => ({
  stateSlug,
  lgdCode: pick(row, ["local body code"]),
  name: pick(row, ["local body name"]),
  placeType: slug(pick(row, ["local body type name"])) || "town-local-body",
  parentCode: pick(row, ["parent localbody code"]),
}));

const output = {
  generatedAt: new Date().toISOString(),
  counts: {
    districts: districts.filter((x) => x.name && x.lgdCode).length,
    subdistricts: subdistricts.filter((x) => x.name && x.lgdCode && x.districtCode).length,
    blocks: blocks.filter((x) => x.name && x.lgdCode && x.districtCode).length,
    villages: villages.filter((x) => x.name && x.lgdCode && x.districtCode).length,
    urbanLocalBodies: urbanLocalBodies.filter((x) => x.name && x.lgdCode).length,
    townLocalBodies: townLocalBodies.filter((x) => x.name && x.lgdCode).length,
  },
  sample: {
    districts: districts.slice(0, 5),
    subdistricts: subdistricts.slice(0, 5),
    blocks: blocks.slice(0, 5),
    villages: villages.slice(0, 5),
    urbanLocalBodies: urbanLocalBodies.slice(0, 5),
    townLocalBodies: townLocalBodies.slice(0, 5),
  },
};

fs.writeFileSync(
  path.join(ROOT, "logs", "lgd-import-dry-run.json"),
  JSON.stringify(output, null, 2),
  "utf8"
);

console.log(JSON.stringify(output.counts, null, 2));
console.log("Dry-run report written: data/lgd/logs/lgd-import-dry-run.json");
