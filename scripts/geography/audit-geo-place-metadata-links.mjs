import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const TABLES = [
  "geo_places",
  "geo_villages",
  "geo_blocks",
  "geo_subdivisions",
  "geo_districts",
  "geo_states"
];

async function columns(table) {
  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) {
    console.log(`\n${table}: ERROR - ${error.message}`);
    return [];
  }
  const cols = Object.keys(data?.[0] || {});
  console.log(`\n${table}:`);
  console.log(cols.join(", "));
  return cols;
}

async function count(table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  console.log(`${table} rows:`, error ? error.message : count);
}

async function sampleGeoPlaces() {
  const { data, error } = await supabase
    .from("geo_places")
    .select("id,name,slug,pincode,latitude,longitude")
    .order("id", { ascending: true })
    .limit(20);

  if (error) throw error;

  console.log("\ngeo_places sample:");
  for (const r of data) {
    const suffix = String(r.slug || "").split("-").pop();
    console.log({ name: r.name, slug: r.slug, suffix });
  }
}

async function testSuffixMatches() {
  const { data: places, error } = await supabase
    .from("geo_places")
    .select("id,name,slug")
    .order("id", { ascending: true })
    .limit(50);

  if (error) throw error;

  const suffixes = places
    .map((p) => String(p.slug || "").split("-").pop())
    .filter(Boolean);

  console.log("\nTesting slug suffixes against likely LGD/code columns...");
  console.log("suffixes:", suffixes.slice(0, 20));

  const tests = [
    ["geo_villages", ["lgd_village_code", "village_code", "code"]],
    ["geo_places", ["lgd_village_code"]],
  ];

  for (const [table, cols] of tests) {
    const tableCols = await columns(table);
    for (const col of cols) {
      if (!tableCols.includes(col)) continue;

      const { data, error: e } = await supabase
        .from(table)
        .select("*")
        .in(col, suffixes)
        .limit(20);

      console.log(`\nMatch test ${table}.${col}:`, e ? e.message : `${data.length} matches`);
      if (data?.length) console.log(data.slice(0, 3));
    }
  }
}

for (const t of TABLES) await count(t);
for (const t of TABLES) await columns(t);
await sampleGeoPlaces();
await testSuffixMatches();
