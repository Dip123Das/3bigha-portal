import fs from "fs";
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

const slug = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const norm = (v) => String(v || "").trim().toLowerCase().replace(/\s+/g, " ");

function parseCsv(path) {
  const text = fs.readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && q && n === '"') { cell += '"'; i++; continue; }
    if (c === '"') { q = !q; continue; }
    if (c === "," && !q) { row.push(cell); cell = ""; continue; }
    if ((c === "\n" || c === "\r") && !q) {
      if (c === "\r" && n === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
      continue;
    }
    cell += c;
  }
  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);
  const headers = rows.shift().map(h => norm(h));
  return rows.map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] || "").trim()])));
}

function pick(row, names) {
  for (const n of names) {
    const k = Object.keys(row).find(x => x === norm(n) || x.includes(norm(n)));
    if (k && row[k]) return row[k];
  }
  return "";
}

async function getMaps() {
  const { data: states } = await supabase.from("geo_states").select("id,name,lgd_code");
  const { data: districts } = await supabase.from("geo_districts").select("id,state_id,name,lgd_code");
  return {
    states: new Map(states.map(s => [norm(s.name), s])),
    districtsByName: new Map(districts.map(d => [norm(d.name), d])),
    districts,
  };
}

async function upsertChunks(table, rows, onConflict) {
  const size = 500;
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw error;
    console.log(table, i + batch.length, "/", rows.length);
  }
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((v, i, a) => v.startsWith("--") ? [v.slice(2), a[i + 1]] : []).filter(Boolean));
  const maps = await getMaps();

  if (args.subdistricts) {
    const rows = parseCsv(args.subdistricts);
    const out = [];
    for (const r of rows) {
      const districtName = pick(r, ["district name", "district"]);
      const name = pick(r, ["subdistrict name", "sub district name", "sub-district name", "subdistrict"]);
      const code = pick(r, ["subdistrict code", "sub district code", "sub-district code"]);
      const d = maps.districtsByName.get(norm(districtName));
      if (!d || !name) continue;
      out.push({
        district_id: d.id,
        name,
        slug: `${slug(name)}-${code || slug(districtName)}`,
        subdivision_type: "subdistrict",
        lgd_code: code || null,
        is_active: true,
        sort_order: 0,
      });
    }
    await upsertChunks("geo_subdivisions", out, "district_id,slug");
  }

  if (args.blocks) {
    const rows = parseCsv(args.blocks);
    const out = [];
    for (const r of rows) {
      const districtName = pick(r, ["district name", "district"]);
      const name = pick(r, ["block name", "development block name", "block"]);
      const code = pick(r, ["block code", "development block code"]);
      const d = maps.districtsByName.get(norm(districtName));
      if (!d || !name) continue;
      out.push({
        district_id: d.id,
        name,
        slug: `${slug(name)}-${code || slug(districtName)}`,
        block_type: "development_block",
        lgd_code: code || null,
        is_active: true,
        sort_order: 0,
      });
    }
    await upsertChunks("geo_blocks", out, "district_id,slug");
  }

  if (args.villages) {
    const { data: subdivisions } = await supabase.from("geo_subdivisions").select("id,district_id,name,lgd_code");
    const { data: blocks } = await supabase.from("geo_blocks").select("id,district_id,name,lgd_code");

    const subMap = new Map(subdivisions.map(x => [`${x.district_id}|${norm(x.name)}`, x]));
    const blockMap = new Map(blocks.map(x => [`${x.district_id}|${norm(x.name)}`, x]));

    const rows = parseCsv(args.villages);
    const out = [];
    for (const r of rows) {
      const districtName = pick(r, ["district name", "district"]);
      const subName = pick(r, ["subdistrict name", "sub district name", "sub-district name", "subdistrict"]);
      const blockName = pick(r, ["block name", "development block name", "block"]);
      const name = pick(r, ["village name", "village"]);
      const code = pick(r, ["village code", "lgd village code"]);
      const d = maps.districtsByName.get(norm(districtName));
      if (!d || !name) continue;

      const sd = subMap.get(`${d.id}|${norm(subName)}`);
      const b = blockMap.get(`${d.id}|${norm(blockName)}`);

      out.push({
        district_id: d.id,
        subdivision_id: sd?.id || null,
        block_id: b?.id || null,
        name,
        slug: `${slug(name)}-${code || out.length}`,
        place_type: "village",
        lgd_code: code || null,
        is_verified: true,
        is_active: true,
        sort_order: 0,
        search_keywords: [name, districtName, subName, blockName].filter(Boolean),
      });
    }
    await upsertChunks("geo_places", out, "district_id,slug,place_type");
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
