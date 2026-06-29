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
  console.error("Usage: node scripts/geography/import-lgd-local-bodies.mjs <state-slug>");
  process.exit(1);
}

const state = requireState(stateSlug);
const supabase = getSupabase();

const sourceRows = readLgdRows("urban-local-bodies", state.slug);

const rows = sourceRows
  .map((row) => {
    const code = toInt(pick(row, ["localbody_code", "local_body_code"]));
    const typeCode = toInt(pick(row, ["localbody_type_code", "local_body_type_code"]));
    const typeName = clean(pick(row, ["localbody_type_name", "local_body_type_name"]));

    const name = clean(
      pick(row, [
        "local_body_name_english",
        "localbody_name_english",
        "local_body_name",
        "localbody_name",
      ])
    );

    if (!code || !name) return null;

    return {
      lgd_local_body_code: code,
      local_body_version: toInt(pick(row, ["localbody_version", "local_body_version"])),
      local_body_type_code: typeCode,
      local_body_type_name: typeName,
      local_body_category: "URBAN",
      parent_local_body_code: null,
      name_en: name,
      name_local: clean(pick(row, ["local_body_name_local", "localbody_name_local"])),
      slug: slugify(name),
      is_active: true,
      source: "LGD",
    };
  })
  .filter(Boolean);

console.log(`State: ${state.name}`);
console.log(`Source rows: ${sourceRows.length}`);
console.log(`Prepared local bodies: ${rows.length}`);

const inserted = await upsertRows({
  supabase,
  table: "geo_lgd_local_bodies",
  rows,
  onConflict: "lgd_local_body_code",
});

console.log(`Upserted local bodies: ${inserted}`);
