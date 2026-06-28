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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ROOT = "data/lgd";

function norm(v){ return String(v || "").replace(/\s+/g," ").trim().toLowerCase(); }
function slug(v){ return String(v || "").trim().toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }

function readRows(file) {
  const wb = XLSX.readFile(file, { cellDates:false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header:1, defval:"" });
  const headerIndex = raw.findIndex(r => r.filter(c => String(c || "").trim()).length >= 2);
  if (headerIndex < 0) return [];
  const headers = raw[headerIndex].map(h => norm(h));
  return raw.slice(headerIndex + 1).filter(r => r.some(c => String(c || "").trim())).map(r => {
    const obj = {};
    headers.forEach((h,i) => {
      if (!h) return;
      const key = obj[h] === undefined ? h : `${h}__${i}`;
      obj[key] = String(r[i] || "").trim();
    });
    return obj;
  });
}

function pick(row, names) {
  for (const name of names) {
    const n = norm(name);
    const key = Object.keys(row).find(k => k === n || k.includes(n));
    if (key && row[key]) return row[key];
  }
  return "";
}

async function fetchFirstDistrict() {
  const { data, error } = await supabase
    .from("geo_districts")
    .select("id,name")
    .order("name")
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

function typeFromName(v, fallback) {
  const t = slug(v);
  if (t.includes("municipal-corporation")) return "municipal_corporation";
  if (t.includes("municipality")) return "municipality";
  if (t.includes("municipal-council")) return "municipal_council";
  if (t.includes("nagar-panchayat")) return "nagar_panchayat";
  if (t.includes("cantonment")) return "cantonment";
  if (t.includes("town")) return "town";
  return fallback;
}

async function upsertChunks(rows) {
  const size = 500;
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase
      .from("geo_places")
      .upsert(batch, { onConflict: "district_id,slug,place_type" });
    if (error) throw error;
    console.log(`geo_places urban: ${i + batch.length}/${rows.length}`);
  }
}

async function main() {
  const fallbackDistrict = await fetchFirstDistrict();
  const all = [];

  for (const folder of ["urban-local-bodies", "town-local-bodies"]) {
    const dir = path.join(ROOT, folder);
    const files = fs.readdirSync(dir).filter(x => /\.xls$/i.test(x)).sort();

    for (const file of files) {
      for (const row of readRows(path.join(dir, file))) {
        const code = pick(row, ["localbody code", "local body code"]);
        const name = pick(row, ["local body name", "localbody name"]);
        const typeName = pick(row, ["localbody type name", "local body type name"]);
        if (!code || !name) continue;

        all.push({
          district_id: fallbackDistrict.id,
          name,
          slug: `${slug(name)}-${code}`,
          place_type: typeFromName(typeName, folder === "town-local-bodies" ? "town_local_body" : "urban_local_body"),
          lgd_code: code,
          is_verified: true,
          is_active: true,
          sort_order: 0,
          search_keywords: [name, typeName].filter(Boolean),
        });
      }
    }
  }

  const dedupedMap = new Map();
  for (const item of all) {
    const key = `${item.district_id}|${item.slug}|${item.place_type}`;
    if (!dedupedMap.has(key)) {
      dedupedMap.set(key, item);
    }
  }

  const deduped = [...dedupedMap.values()];
  console.log("urban rows:", all.length);
  console.log("urban rows deduped:", deduped.length);
  await upsertChunks(deduped);
  console.log("Urban import complete:", deduped.length);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
