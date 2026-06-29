import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function rpcSql(sql) {
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) throw error;
}

const sql = `
insert into geo_lgd_settlements (
  settlement_key, settlement_type, name_en, name_local, display_name, slug,
  lgd_state_code, lgd_district_code, lgd_subdistrict_code, lgd_block_code,
  lgd_village_code, source_table
)
select
  'village:' || v.lgd_village_code,
  'VILLAGE',
  v.name_en,
  v.name_local,
  v.name_en || ', ' || d.name_en || ', West Bengal',
  v.slug,
  19,
  v.lgd_district_code,
  v.lgd_subdistrict_code,
  v.lgd_block_code,
  v.lgd_village_code,
  'geo_lgd_villages'
from geo_lgd_villages v
left join geo_lgd_districts d on d.lgd_district_code = v.lgd_district_code
on conflict (settlement_key) do update set
  name_en = excluded.name_en,
  name_local = excluded.name_local,
  display_name = excluded.display_name,
  slug = excluded.slug,
  lgd_district_code = excluded.lgd_district_code,
  lgd_subdistrict_code = excluded.lgd_subdistrict_code,
  lgd_block_code = excluded.lgd_block_code,
  updated_at = now();

insert into geo_lgd_settlements (
  settlement_key, settlement_type, name_en, display_name, slug,
  lgd_state_code, lgd_district_code, lgd_block_code, lgd_village_code,
  source_table
)
select
  'special-block-settlement:' || bv.lgd_village_code,
  case
    when lower(bv.village_name_en) like '%(ct)%' then 'CENSUS_TOWN'
    when lower(bv.village_name_en) like '%(p)%' then 'OUTGROWTH'
    when lower(bv.village_name_en) like '%forest%' then 'FOREST_SETTLEMENT'
    else 'OUTGROWTH'
  end,
  bv.village_name_en,
  bv.village_name_en || ', ' || coalesce(b.name_en, bv.block_name_en) || ', West Bengal',
  lower(regexp_replace(bv.village_name_en, '[^a-zA-Z0-9]+', '-', 'g')),
  19,
  bv.lgd_district_code,
  bv.lgd_block_code,
  bv.lgd_village_code,
  'geo_lgd_block_villages'
from geo_lgd_block_villages bv
left join geo_lgd_villages v on v.lgd_village_code = bv.lgd_village_code
left join geo_lgd_blocks b on b.lgd_block_code = bv.lgd_block_code
where v.lgd_village_code is null
on conflict (settlement_key) do update set
  settlement_type = excluded.settlement_type,
  name_en = excluded.name_en,
  display_name = excluded.display_name,
  slug = excluded.slug,
  lgd_block_code = excluded.lgd_block_code,
  updated_at = now();

insert into geo_lgd_settlements (
  settlement_key, settlement_type, name_en, name_local, display_name, slug,
  lgd_state_code, lgd_local_body_code, lgd_ward_code,
  source_table
)
select
  'ward:' || w.lgd_ward_code,
  case when w.ward_category = 'URBAN' then 'URBAN_WARD' else 'PRI_WARD' end,
  w.ward_name_en,
  w.ward_name_local,
  w.ward_name_en || ', ' || coalesce(w.local_body_name_en, 'Local Body') || ', West Bengal',
  w.slug,
  19,
  w.lgd_local_body_code,
  w.lgd_ward_code,
  'geo_lgd_wards'
from geo_lgd_wards w
on conflict (settlement_key) do update set
  settlement_type = excluded.settlement_type,
  name_en = excluded.name_en,
  name_local = excluded.name_local,
  display_name = excluded.display_name,
  slug = excluded.slug,
  lgd_local_body_code = excluded.lgd_local_body_code,
  updated_at = now();

insert into geo_lgd_settlements (
  settlement_key, settlement_type, name_en, name_local, display_name, slug,
  lgd_state_code, lgd_local_body_code,
  source_table
)
select
  'local-body:' || lb.lgd_local_body_code,
  'LOCAL_BODY',
  lb.name_en,
  lb.name_local,
  lb.name_en || ', West Bengal',
  lb.slug,
  19,
  lb.lgd_local_body_code,
  'geo_lgd_local_bodies'
from geo_lgd_local_bodies lb
on conflict (settlement_key) do update set
  name_en = excluded.name_en,
  name_local = excluded.name_local,
  display_name = excluded.display_name,
  slug = excluded.slug,
  updated_at = now();
`;

async function countRows() {
  const { data, error } = await supabase
    .from("geo_lgd_settlements")
    .select("settlement_type", { count: "exact" })
    .limit(1);

  if (error) throw error;
  return data;
}

async function main() {
  console.log("G6-G2 WB settlement builder");
  console.log("Mode:", APPLY ? "APPLY" : "DRY RUN");

  if (!APPLY) {
    console.log("Dry run only. SQL prepared.");
    return;
  }

  await rpcSql(sql);
  console.log("Done.");
}

main().catch((err) => {
  console.error("SETTLEMENT BUILD FAILED:", err);
  process.exit(1);
});