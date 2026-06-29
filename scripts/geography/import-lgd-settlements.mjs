import { getSupabase, requireState, slugify } from "./lgd-import-utils.mjs";

const stateSlug = process.argv[2];

if (!stateSlug) {
  console.error("Usage: node scripts/geography/import-lgd-settlements.mjs <state-slug>");
  process.exit(1);
}

const state = requireState(stateSlug);
const supabase = getSupabase();

async function fetchAll(table, select, filters = {}) {
  let all = [];
  let from = 0;
  const size = 1000;

  while (true) {
    let query = supabase.from(table).select(select);

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query.range(from, from + size - 1);

    if (error) throw new Error(`${table} fetch failed: ${error.message}`);

    all = all.concat(data || []);
    if (!data || data.length < size) break;
    from += size;
  }

  return all;
}

async function upsertChunks(rows) {
  let total = 0;

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);

    const { error } = await supabase
      .from("geo_lgd_settlements")
      .upsert(chunk, { onConflict: "settlement_key" });

    if (error) throw new Error(`settlement upsert failed: ${error.message}`);

    total += chunk.length;
  }

  return total;
}

const districts = await fetchAll(
  "geo_lgd_districts",
  "lgd_district_code",
  { lgd_state_code: state.lgdCode, is_active: true }
);

const districtCodes = new Set(districts.map((d) => d.lgd_district_code));

const allVillages = await fetchAll(
  "geo_lgd_villages",
  "lgd_village_code,lgd_district_code,lgd_subdistrict_code,lgd_block_code,name_en,name_local",
  { is_active: true }
);

const villages = allVillages.filter((v) => districtCodes.has(v.lgd_district_code));

const allLocalBodies = await fetchAll(
  "geo_lgd_local_bodies",
  "lgd_local_body_code,name_en,name_local,local_body_category",
  { is_active: true }
);

const currentUlbCodes = new Set(
  (await fetchAll(
    "geo_lgd_wards",
    "lgd_local_body_code",
    { is_active: true }
  )).map((w) => w.lgd_local_body_code)
);

const localBodies = allLocalBodies.filter((b) => currentUlbCodes.has(b.lgd_local_body_code));

const wards = await fetchAll(
  "geo_lgd_wards",
  "lgd_ward_code,lgd_local_body_code,ward_name_en,ward_name_local,local_body_name_en",
  { is_active: true }
);

const rows = [];

for (const village of villages) {
  rows.push({
    settlement_key: `village:${village.lgd_village_code}`,
    settlement_type: "VILLAGE",
    name_en: village.name_en,
    name_local: village.name_local || "",
    display_name: village.name_en,
    slug: slugify(village.name_en),
    lgd_state_code: state.lgdCode,
    lgd_district_code: village.lgd_district_code,
    lgd_subdistrict_code: village.lgd_subdistrict_code,
    lgd_block_code: village.lgd_block_code,
    lgd_village_code: village.lgd_village_code,
    lgd_local_body_code: null,
    lgd_ward_code: null,
    source_table: "geo_lgd_villages",
    source: "LGD",
    is_active: true,
  });
}

for (const body of localBodies) {
  rows.push({
    settlement_key: `local_body:${body.lgd_local_body_code}`,
    settlement_type: body.local_body_category === "URBAN" ? "URBAN_LOCAL_BODY" : "LOCAL_BODY",
    name_en: body.name_en,
    name_local: body.name_local || "",
    display_name: body.name_en,
    slug: slugify(body.name_en),
    lgd_state_code: state.lgdCode,
    lgd_district_code: null,
    lgd_subdistrict_code: null,
    lgd_block_code: null,
    lgd_village_code: null,
    lgd_local_body_code: body.lgd_local_body_code,
    lgd_ward_code: null,
    source_table: "geo_lgd_local_bodies",
    source: "LGD",
    is_active: true,
  });
}

for (const ward of wards) {
  rows.push({
    settlement_key: `ward:${ward.lgd_ward_code}`,
    settlement_type: "WARD",
    name_en: ward.ward_name_en,
    name_local: ward.ward_name_local || "",
    display_name: ward.local_body_name_en
      ? `${ward.local_body_name_en} - ${ward.ward_name_en}`
      : ward.ward_name_en,
    slug: slugify(`${ward.local_body_name_en || ""}-${ward.ward_name_en}`),
    lgd_state_code: state.lgdCode,
    lgd_district_code: null,
    lgd_subdistrict_code: null,
    lgd_block_code: null,
    lgd_village_code: null,
    lgd_local_body_code: ward.lgd_local_body_code,
    lgd_ward_code: ward.lgd_ward_code,
    source_table: "geo_lgd_wards",
    source: "LGD",
    is_active: true,
  });
}

console.log(`State: ${state.name}`);
console.log(`Village settlements: ${villages.length}`);
console.log(`Local body settlements: ${localBodies.length}`);
console.log(`Ward settlements: ${wards.length}`);
console.log(`Prepared settlements: ${rows.length}`);

const inserted = await upsertChunks(rows);

console.log(`Upserted settlements: ${inserted}`);
