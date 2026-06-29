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
  console.error("Usage: node scripts/geography/import-lgd-villages.mjs <state-slug>");
  process.exit(1);
}

const state = requireState(stateSlug);
const supabase = getSupabase();

const sourceRows = readLgdRows("villages", state.slug);

const rows = sourceRows
  .map((row) => {
    const villageCode = toInt(pick(row, ["village_code"]));
    const districtCode = toInt(pick(row, ["district_code"]));
    const subdistrictCode = toInt(
      pick(row, ["sub_district_code", "subdistrict_code"])
    );

    const name = clean(
      pick(row, [
        "village_name_english",
        "village_name",
        "village_name_0",
      ])
    );

    if (!villageCode || !districtCode || !subdistrictCode || !name) return null;

    return {
      lgd_village_code: villageCode,
      village_version: toInt(pick(row, ["village_version"])),
      lgd_district_code: districtCode,
      lgd_subdistrict_code: subdistrictCode,
      lgd_block_code: null,
      lgd_gram_panchayat_code: null,
      name_en: name,
      name_local: clean(pick(row, ["village_name_local"])),
      village_status: clean(pick(row, ["village_status"])),
      census_2001_code: clean(pick(row, ["census_2001_code"])),
      census_2011_code: clean(pick(row, ["census_2011_code"])),
      remark: clean(pick(row, ["remark"])),
      slug: slugify(name),
      is_active: true,
      source: "LGD",
    };
  })
  .filter(Boolean);

console.log(`State: ${state.name}`);
console.log(`Source rows: ${sourceRows.length}`);
console.log(`Prepared villages: ${rows.length}`);

const inserted = await upsertRows({
  supabase,
  table: "geo_lgd_villages",
  rows,
  onConflict: "lgd_village_code",
});

console.log(`Upserted villages: ${inserted}`);
