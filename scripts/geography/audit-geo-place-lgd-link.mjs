import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const PAGE_SIZE = 5000;

let total = 0;
let withDistrict = 0;
let withSubdivision = 0;
let withBlock = 0;
let withLgd = 0;
let suffixMatches = 0;
let sample = [];
let lastId = null;

while (true) {
  let q = supabase
    .from("geo_places")
    .select("id,name,slug,lgd_code,district_id,subdivision_id,block_id")
    .order("id", { ascending: true })
    .limit(PAGE_SIZE);

  if (lastId) q = q.gt("id", lastId);

  const { data, error } = await q;
  if (error) throw error;
  if (!data || data.length === 0) break;

  for (const r of data) {
    total++;
    if (r.district_id) withDistrict++;
    if (r.subdivision_id) withSubdivision++;
    if (r.block_id) withBlock++;
    if (r.lgd_code) withLgd++;

    const suffix = String(r.slug || "").split("-").pop();
    if (String(r.lgd_code) === suffix) suffixMatches++;

    if (sample.length < 20) {
      sample.push({
        name: r.name,
        slug: r.slug,
        suffix,
        lgd_code: r.lgd_code,
        suffix_matches_lgd_code: String(r.lgd_code) === suffix,
        district_id: r.district_id,
        subdivision_id: r.subdivision_id,
        block_id: r.block_id
      });
    }
  }

  lastId = data[data.length - 1].id;
  console.log("Scanned:", total);
}

console.log("\nSummary:");
console.log({
  total,
  withDistrict,
  withSubdivision,
  withBlock,
  withLgd,
  suffixMatches
});

console.log("\nSample:");
console.log(sample);
