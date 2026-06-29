import {
  clean,
  getSupabase,
  pick,
  readLgdRows,
  requireState,
  slugify,
  toInt,
  upsertRows,
} from "./lgd-import-utils.mjs";

const stateSlug = process.argv[2];

if (!stateSlug) {
  console.error("Usage: node scripts/geography/import-lgd-districts.mjs <state-slug>");
  process.exit(1);
}

const state = requireState(stateSlug);
const supabase = getSupabase();

const sourceRows = readLgdRows("districts", state.slug);

const rows = sourceRows
  .map((row) => {
    const lgdCode = toInt(pick(row, ["district_code"]));
    const name = clean(
      pick(row, [
        "district_name_english",
        "district_name",
        "district_name_0",
      ])
    );

    if (!lgdCode || !name) return null;

    return {
      lgd_district_code: lgdCode,
      lgd_state_code: state.lgdCode,
      district_version: toInt(pick(row, ["district_version"])),
      name_en: name,
      name_local: clean(pick(row, ["district_name_local"])),
      census_2001_code: clean(pick(row, ["census_2001_code"])),
      census_2011_code: clean(pick(row, ["census_2011_code"])),
      slug: slugify(name),
      is_active: true,
      source: "LGD",
    };
  })
  .filter(Boolean);

console.log(`State: ${state.name}`);
console.log(`Source rows: ${sourceRows.length}`);
console.log(`Prepared districts: ${rows.length}`);

const inserted = await upsertRows({
  supabase,
  table: "geo_lgd_districts",
  rows,
  onConflict: "lgd_district_code",
});

console.log(`Upserted districts: ${inserted}`);
