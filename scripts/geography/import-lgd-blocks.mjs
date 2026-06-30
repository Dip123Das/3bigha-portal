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
  console.error("Usage: node scripts/geography/import-lgd-blocks.mjs <state-slug>");
  process.exit(1);
}

const state = requireState(stateSlug);
const supabase = getSupabase();

const sourceRows = readLgdRows("blocks", state.slug);

const preparedRows = sourceRows
  .map((row) => {
    const lgdCode = toInt(pick(row, ["block_code"]));
    const districtCode = toInt(pick(row, ["district_code"]));
    const name = clean(
      pick(row, [
        "block_name_english",
        "block_name",
        "block_name_0",
      ])
    );

    if (!lgdCode || !districtCode || !name) return null;

    return {
      lgd_block_code: lgdCode,
      lgd_district_code: districtCode,
      block_version: toInt(pick(row, ["block_version"])),
      name_en: name,
      name_local: clean(pick(row, ["block_name_local"])),
      slug: slugify(name),
      is_active: true,
      source: "LGD",
    };
  })
  .filter(Boolean);

const rows = Array.from(
  new Map(preparedRows.map((row) => [row.lgd_block_code, row])).values()
);

console.log(`State: ${state.name}`);
console.log(`Source rows: ${sourceRows.length}`);
console.log(`Prepared blocks: ${preparedRows.length}`);
console.log(`Unique blocks: ${rows.length}`);

const inserted = await upsertRows({
  supabase,
  table: "geo_lgd_blocks",
  rows,
  onConflict: "lgd_block_code",
});

console.log(`Upserted blocks: ${inserted}`);
