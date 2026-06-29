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
  console.error("Usage: node scripts/geography/import-lgd-subdistricts.mjs <state-slug>");
  process.exit(1);
}

const state = requireState(stateSlug);
const supabase = getSupabase();

const sourceRows = readLgdRows("subdistricts", state.slug);

const rows = sourceRows
  .map((row) => {
    const lgdCode = toInt(pick(row, ["subdistrict_code"]));
    const districtCode = toInt(pick(row, ["district_code"]));
    const name = clean(
      pick(row, [
        "subdistrict_name_english",
        "subdistrict_name",
        "subdistrict_name_0",
      ])
    );

    if (!lgdCode || !districtCode || !name) return null;

    return {
      lgd_subdistrict_code: lgdCode,
      lgd_district_code: districtCode,
      subdistrict_version: toInt(pick(row, ["subdistrict_version"])),
      name_en: name,
      name_local: clean(pick(row, ["subdistrict_name_local"])),
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
console.log(`Prepared subdistricts: ${rows.length}`);

const inserted = await upsertRows({
  supabase,
  table: "geo_lgd_subdistricts",
  rows,
  onConflict: "lgd_subdistrict_code",
});

console.log(`Upserted subdistricts: ${inserted}`);
