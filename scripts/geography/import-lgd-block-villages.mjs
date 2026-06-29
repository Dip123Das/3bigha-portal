import {
  clean,
  getSupabase,
  pick,
  readLgdRows,
  requireState,
  toInt,
  upsertRows,
} from "./lgd-import-utils.mjs";

const stateSlug = process.argv[2];

if (!stateSlug) {
  console.error("Usage: node scripts/geography/import-lgd-block-villages.mjs <state-slug>");
  process.exit(1);
}

const state = requireState(stateSlug);
const supabase = getSupabase();

const sourceRows = readLgdRows("block-covered-villages", state.slug);

const rows = sourceRows
  .map((row) => {
    const stateCode = toInt(pick(row, ["state_code"]));
    const districtCode = toInt(pick(row, ["district_code"]));
    const blockCode = toInt(pick(row, ["block_code"]));
    const villageCode = toInt(pick(row, ["village_code"]));

    if (!stateCode || !districtCode || !blockCode || !villageCode) return null;

    return {
      lgd_block_code: blockCode,
      lgd_village_code: villageCode,
      lgd_district_code: districtCode,
      lgd_state_code: stateCode,
      block_name_en: clean(pick(row, ["block_name_in_english", "block_name"])),
      village_name_en: clean(pick(row, ["village_name_in_english", "village_name"])),
      source: "LGD",
    };
  })
  .filter(Boolean);

console.log(`State: ${state.name}`);
console.log(`Source rows: ${sourceRows.length}`);
console.log(`Prepared block-village links: ${rows.length}`);

const inserted = await upsertRows({
  supabase,
  table: "geo_lgd_block_villages",
  rows,
  onConflict: "lgd_block_code,lgd_village_code",
});

console.log(`Upserted block-village links: ${inserted}`);
