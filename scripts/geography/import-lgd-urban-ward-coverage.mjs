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
    const districtName = clean(pick(row, ["district_name"]));
    const subdistrictName = clean(pick(row, ["subdistrict_name"]));

    if (!wardCode || !districtName) return null;

    return {
      lgd_ward_code: wardCode,
      district_level_parent_name: districtName,
      intermediate_level_parent_name: subdistrictName,
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
  const values = chunk
    .map((row) => {
      const district = row.district_level_parent_name.replaceAll("'", "''");
      const subdistrict = row.intermediate_level_parent_name.replaceAll("'", "''");
      return `(${row.lgd_ward_code}, '${district}', '${subdistrict}')`;
    })
    .join(",");

  const sql = `
    update public.geo_lgd_wards as w
    set
      district_level_parent_name = v.district_level_parent_name,
      intermediate_level_parent_name = v.intermediate_level_parent_name
    from (
      values ${values}
    ) as v(lgd_ward_code, district_level_parent_name, intermediate_level_parent_name)
    where w.lgd_ward_code = v.lgd_ward_code;
  `;

  const { error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    throw new Error(`Batch update failed: ${error.message}`);
  }

  console.log(`Updated ${Math.min(i + 500, unique.length)} / ${unique.length}`);
}

console.log(`Updated ward coverage: ${unique.length}`);
