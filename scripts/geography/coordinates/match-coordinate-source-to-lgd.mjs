import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error("Usage: node scripts/geography/coordinates/match-coordinate-source-to-lgd.mjs <normalized.json> <import.json>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const typeToTable = {
  state: "geo_states",
  district: "geo_districts",
  subdivision: "geo_subdivisions",
  subdistrict: "geo_subdivisions",
  block: "geo_blocks",
  place: "geo_places",
  village: "geo_places",
  town: "geo_places",
};

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeType(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

const rows = JSON.parse(fs.readFileSync(path.resolve(inputFile), "utf8"));

if (!Array.isArray(rows)) {
  console.error("Input must be a JSON array.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function findMatch(row) {
  const sourceType = normalizeType(row.source_entity_type);
  const table = typeToTable[sourceType];

  if (!table) return null;

  if (row.source_code) {
    const { data, error } = await supabase
      .from(table)
      .select("id,name,lgd_code")
      .eq("lgd_code", String(row.source_code))
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return { table, row: data, match_method: "lgd_code" };
  }

  const slug = slugify(row.source_name);

  if (slug) {
    const { data, error } = await supabase
      .from(table)
      .select("id,name,slug,lgd_code")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return { table, row: data, match_method: "slug" };
  }

  return null;
}

const matched = [];
const unmatched = [];

for (const row of rows) {
  const match = await findMatch(row);

  if (!match) {
    unmatched.push(row);
    continue;
  }

  matched.push({
    entity_type: Object.entries(typeToTable).find(([, table]) => table === match.table)?.[0] || row.source_entity_type,
    entity_id: match.row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    match_method: match.match_method,
    source_name: row.source_name,
    source_code: row.source_code,
  });
}

fs.writeFileSync(path.resolve(outputFile), JSON.stringify(matched, null, 2));

const unmatchedFile = outputFile.replace(/\.json$/i, ".unmatched.json");
fs.writeFileSync(path.resolve(unmatchedFile), JSON.stringify(unmatched, null, 2));

console.log(`Matched: ${matched.length}`);
console.log(`Unmatched: ${unmatched.length}`);
console.log(`Wrote: ${outputFile}`);
console.log(`Wrote: ${unmatchedFile}`);
