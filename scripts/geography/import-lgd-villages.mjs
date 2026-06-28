import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ROOT = "data/lgd";
const LOG = path.join(ROOT, "logs", "lgd-villages-progress.json");

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

function readRows(file) {
  const wb = XLSX.readFile(file, { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const headerIndex = raw.findIndex((row) => row.filter((cell) => String(cell || "").trim()).length >= 2);
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

async function fetchMap(table, select, keyFn) {
  const out = new Map();
  let from = 0;
  const step = 1000;

  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + step - 1);
    if (error) throw error;
    for (const item of data || []) out.set(keyFn(item), item);
    if (!data || data.length < step) break;
    from += step;
  }

  return out;
}

async function upsertChunks(rows) {
  const size = 500;
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase
      .from("geo_places")
      .upsert(batch, { onConflict: "district_id,slug,place_type" });

    if (error) throw error;
  }
}

function loadProgress() {
  if (!fs.existsSync(LOG)) return { doneFiles: [] };
  return JSON.parse(fs.readFileSync(LOG, "utf8"));
}

function saveProgress(progress) {
  fs.writeFileSync(LOG, JSON.stringify(progress, null, 2), "utf8");
}

async function main() {
  const progress = loadProgress();
  const done = new Set(progress.doneFiles || []);

  const districtsByLgd = await fetchMap(
    "geo_districts",
    "id,lgd_code,district_code,name",
    (d) => d.lgd_code || d.district_code
  );

  const subdivisionsByDistrictAndLgd = await fetchMap(
    "geo_subdivisions",
    "id,district_id,lgd_code,name",
    (s) => `${s.district_id}|${s.lgd_code}`
  );

  const blocksByDistrictAndLgd = await fetchMap(
    "geo_blocks",
    "id,district_id,lgd_code,name",
    (b) => `${b.district_id}|${b.lgd_code}`
  );

  const blockCoveredRows = [];
  const bcvDir = path.join(ROOT, "block-covered-villages");
  for (const file of fs.readdirSync(bcvDir).filter((x) => /\.xls$/i.test(x)).sort()) {
    for (const row of readRows(path.join(bcvDir, file))) {
      const villageCode = pick(row, ["village code"]);
      const blockCode = pick(row, ["block code"]);
      if (villageCode && blockCode) blockCoveredRows.push([villageCode, blockCode]);
    }
  }

  const blockCodeByVillageCode = new Map(blockCoveredRows);

  const dir = path.join(ROOT, "villages");
  const files = fs.readdirSync(dir).filter((x) => /\.xls$/i.test(x)).sort();

  let grandTotal = 0;

  for (const file of files) {
    if (done.has(file)) {
      console.log("skip done:", file);
      continue;
    }

    const rows = readRows(path.join(dir, file));
    const out = [];

    for (const row of rows) {
      const districtCode = pick(row, ["district code"]);
      const subdistrictCode = pick(row, ["sub-district code", "subdistrict code"]);
      const villageCode = pick(row, ["village code"]);
      const name = pick(row, ["village name"]);

      const district = districtsByLgd.get(districtCode);
      if (!district || !villageCode || !name) continue;

      const subdivision = subdivisionsByDistrictAndLgd.get(`${district.id}|${subdistrictCode}`);
      const blockCode = blockCodeByVillageCode.get(villageCode);
      const block = blockCode ? blocksByDistrictAndLgd.get(`${district.id}|${blockCode}`) : null;

      out.push({
        district_id: district.id,
        subdivision_id: subdivision?.id || null,
        block_id: block?.id || null,
        name,
        slug: `${slug(name)}-${villageCode}`,
        place_type: "village",
        lgd_code: villageCode,
        is_verified: true,
        is_active: true,
        sort_order: 0,
        search_keywords: [name, district.name, subdivision?.name, block?.name].filter(Boolean),
      });
    }

    console.log("importing", file, out.length);
    await upsertChunks(out);
    grandTotal += out.length;

    done.add(file);
    progress.doneFiles = [...done];
    progress.lastFile = file;
    progress.updatedAt = new Date().toISOString();
    saveProgress(progress);

    console.log("done", file);
  }

  console.log("Village import complete. Imported this run:", grandTotal);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
