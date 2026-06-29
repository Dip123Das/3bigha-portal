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
  console.error("Usage: node scripts/geography/import-lgd-wards.mjs <state-slug>");
  process.exit(1);
}

const state = requireState(stateSlug);
const supabase = getSupabase();

const sourceRows = readLgdRows("urban-local-body-wards", state.slug);

const rows = sourceRows
  .map((row) => {
    const wardCode = toInt(pick(row, ["ward_code"]));
    const localBodyCode = toInt(pick(row, ["local_body_code"]));
    const wardNumber = clean(pick(row, ["ward_number"]));
    const wardName = clean(pick(row, ["ward_name"]));
    const localBodyName = clean(pick(row, ["local_body_name"]));

    if (!wardCode || !localBodyCode || !wardName) return null;

    return {
      lgd_ward_code: wardCode,
      ward_number: wardNumber,
      ward_name_en: wardName,
      ward_name_local: "",
      ward_category: "URBAN",
      lgd_local_body_code: localBodyCode,
      local_body_name_en: localBodyName,
      local_body_type_name: "",
      district_level_parent_name: "",
      intermediate_level_parent_name: "",
      slug: slugify(`${localBodyName}-${wardName || wardNumber}`),
      is_active: true,
      source: "LGD",
    };
  })
  .filter(Boolean);

console.log(`State: ${state.name}`);
console.log(`Source rows: ${sourceRows.length}`);
console.log(`Prepared wards: ${rows.length}`);

const inserted = await upsertRows({
  supabase,
  table: "geo_lgd_wards",
  rows,
  onConflict: "lgd_ward_code",
});

console.log(`Upserted wards: ${inserted}`);
