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

let sourceRows = [];

try {
  sourceRows = readLgdRows("urban-local-body-wards", state.slug);
} catch (error) {
  sourceRows = readLgdRows("urban-local-body-wards-covered", state.slug);
}


const localBodySeedRows = Array.from(
  new Map(
    sourceRows
      .map((row) => {
        const localBodyCode = toInt(pick(row, ["local_body_code"]));
        const localBodyName = clean(pick(row, ["local_body_name"]));

        if (!localBodyCode || !localBodyName) return null;

        return [
          localBodyCode,
          {
            lgd_local_body_code: localBodyCode,
            local_body_version: 1,
            local_body_type_code: 0,
            local_body_type_name: "Urban Local Body",
            local_body_category: "URBAN",
            parent_local_body_code: null,
            name_en: localBodyName,
            name_local: "",
            slug: slugify(localBodyName),
            is_active: true,
            source: "LGD",
          },
        ];
      })
      .filter(Boolean)
  ).values()
);

if (localBodySeedRows.length) {
  const { data: existingBodies, error: existingBodiesError } = await supabase
    .from("geo_lgd_local_bodies")
    .select("lgd_local_body_code")
    .in(
      "lgd_local_body_code",
      localBodySeedRows.map((row) => row.lgd_local_body_code)
    );

  if (existingBodiesError) throw existingBodiesError;

  const existingCodes = new Set(
    (existingBodies || []).map((row) => row.lgd_local_body_code)
  );

  const missingBodies = localBodySeedRows.filter(
    (row) => !existingCodes.has(row.lgd_local_body_code)
  );

  if (missingBodies.length) {
    const insertedBodies = await upsertRows({
      supabase,
      table: "geo_lgd_local_bodies",
      rows: missingBodies,
      onConflict: "lgd_local_body_code",
    });

    console.log(`Seeded missing local bodies: ${insertedBodies}`);
  }
}

const preparedRows = sourceRows
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

const rows = Array.from(
  new Map(preparedRows.map((row) => [row.lgd_ward_code, row])).values()
);

console.log(`State: ${state.name}`);
console.log(`Source rows: ${sourceRows.length}`);
console.log(`Prepared wards: ${preparedRows.length}`);
console.log(`Unique wards: ${rows.length}`);

const inserted = await upsertRows({
  supabase,
  table: "geo_lgd_wards",
  rows,
  onConflict: "lgd_ward_code",
});

console.log(`Upserted wards: ${inserted}`);
