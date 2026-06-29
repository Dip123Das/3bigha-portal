import { clean, getSupabase, pick, readLgdRows, requireState, toInt } from "./lgd-import-utils.mjs";

const stateSlug = process.argv[2];
if (!stateSlug) {
  console.error("Usage: node scripts/geography/import-lgd-urban-ward-coverage.mjs <state-slug>");
  process.exit(1);
}

const state = requireState(stateSlug);
const supabase = getSupabase();
const rows = readLgdRows("urban-local-body-wards-covered", state.slug);

const updates = rows
  .map((row) => {
    const wardCode = toInt(pick(row, ["ward_code"]));
    const districtCode = toInt(pick(row, ["district_code"]));
    const districtName = clean(pick(row, ["district_name"]));
    const subdistrictName = clean(pick(row, ["subdistrict_name"]));

    if (!wardCode || !districtCode || !districtName) return null;

    return {
      lgd_ward_code: wardCode,
      district_level_parent_name: districtName,
      intermediate_level_parent_name: subdistrictName,
      source: "LGD",
    };
  })
  .filter(Boolean);

const unique = Array.from(
  new Map(updates.map((row) => [row.lgd_ward_code, row])).values()
);

console.log(`State: ${state.name}`);
console.log(`Source rows: ${rows.length}`);
console.log(`Prepared ward coverage updates: ${unique.length}`);

for (let i = 0; i < unique.length; i += 500) {
  const chunk = unique.slice(i, i + 500);
  const { error } = await supabase
    .from("geo_lgd_wards")
    .upsert(chunk, { onConflict: "lgd_ward_code" });

  if (error) throw new Error(error.message);
}

console.log(`Updated ward coverage: ${unique.length}`);
