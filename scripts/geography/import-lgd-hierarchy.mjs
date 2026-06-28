import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  return name.replace(/\.xlsx?$/i, "").replace(new RegExp(`^${prefix}-`, "i"), "");
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
    for (const row of readRows(full)) rows.push({ stateSlug, row });
  }
  return rows;
}

async function fetchMap(table, select, keyFn) {
  const out = new Map();
  let from = 0;
  const step = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + step - 1);

    if (error) throw error;
    for (const item of data || []) out.set(keyFn(item), item);
    if (!data || data.length < step) break;
    from += step;
  }

  return out;
}

async function upsertChunks(table, rows, onConflict) {
  const size = 500;
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw error;
    console.log(`${table}: ${i + batch.length}/${rows.length}`);
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log("LGD hierarchy import started", startedAt);

  const statesBySlug = await fetchMap(
    "geo_states",
    "id,name,slug,lgd_code",
    (s) => s.slug
  );

  console.log("states loaded:", statesBySlug.size);

  const districtRows = readFolder("districts", "districts")
    .map(({ stateSlug, row }) => {
      const state = statesBySlug.get(stateSlug);
      const name = pick(row, ["district name"]);
      const lgdCode = pick(row, ["district code"]);
      if (!state || !name || !lgdCode) return null;

      return {
        state_id: state.id,
        name,
        slug: slug(name),
        district_code: lgdCode,
        lgd_code: lgdCode,
        is_active: true,
        sort_order: 0,
      };
    })
    .filter(Boolean);

  console.log("district rows:", districtRows.length);
  await upsertChunks("geo_districts", districtRows, "state_id,slug");

  const districtsByLgd = await fetchMap(
    "geo_districts",
    "id,state_id,name,slug,lgd_code,district_code",
    (d) => d.lgd_code || d.district_code
  );

  const subdistrictRows = readFolder("subdistricts", "subdistricts")
    .map(({ row }) => {
      const districtCode = pick(row, ["district code"]);
      const district = districtsByLgd.get(districtCode);
      const name = pick(row, ["subdistrict name"]);
      const lgdCode = pick(row, ["subdistrict code"]);
      if (!district || !name || !lgdCode) return null;

      return {
        district_id: district.id,
        name,
        slug: `${slug(name)}-${lgdCode}`,
        subdivision_type: "subdistrict",
        lgd_code: lgdCode,
        is_active: true,
        sort_order: 0,
      };
    })
    .filter(Boolean);

  console.log("subdistrict rows:", subdistrictRows.length);
  await upsertChunks("geo_subdivisions", subdistrictRows, "district_id,slug");

  const blockRows = readFolder("blocks", "blocks")
    .map(({ row }) => {
      const districtCode = pick(row, ["district code"]);
      const district = districtsByLgd.get(districtCode);
      const name = pick(row, ["block name"]);
      const lgdCode = pick(row, ["block code"]);
      if (!district || !name || !lgdCode) return null;

      return {
        district_id: district.id,
        name,
        slug: `${slug(name)}-${lgdCode}`,
        block_type: "development_block",
        lgd_code: lgdCode,
        is_active: true,
        sort_order: 0,
      };
    })
    .filter(Boolean);

  console.log("block rows:", blockRows.length);
  await upsertChunks("geo_blocks", blockRows, "district_id,slug");

  const log = {
    startedAt,
    finishedAt: new Date().toISOString(),
    imported: {
      districts: districtRows.length,
      subdistricts: subdistrictRows.length,
      blocks: blockRows.length,
    },
  };

  fs.writeFileSync(
    path.join(ROOT, "logs", "lgd-hierarchy-import-log.json"),
    JSON.stringify(log, null, 2),
    "utf8"
  );

  console.log("LGD hierarchy import complete");
  console.log(JSON.stringify(log.imported, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
