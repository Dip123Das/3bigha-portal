import { getSupabase } from "./lgd-import-utils.mjs";

const stateCode = process.argv[2];

if (!stateCode) {
  console.error("Usage: node scripts/geography/populate-settlement-intelligence-state.mjs <lgd-state-code>");
  process.exit(1);
}

const supabase = getSupabase();

const sql = `
insert into public.geo_settlement_intelligence (
  settlement_key, settlement_type, name_en, display_name, slug,
  lgd_state_code, state_name, state_slug,
  lgd_district_code, district_name, district_slug,
  lgd_subdistrict_code, subdistrict_name, subdistrict_slug,
  lgd_block_code, block_name, block_slug,
  lgd_village_code, lgd_local_body_code, local_body_name, local_body_type_name,
  lgd_ward_code, ward_name, primary_pincode, search_text,
  hierarchy_json, postal_json, updated_at
)
select
  s.settlement_key, s.settlement_type, s.name_en, s.display_name, s.slug,
  st.lgd_state_code, st.name_en, st.slug,
  d.lgd_district_code, d.name_en, d.slug,
  sd.lgd_subdistrict_code, sd.name_en, sd.slug,
  b.lgd_block_code, b.name_en, b.slug,
  s.lgd_village_code, s.lgd_local_body_code, lb.name_en, lb.local_body_type_name,
  s.lgd_ward_code, w.ward_name_en, s.pincode,
  concat_ws(' ', s.name_en, s.display_name, w.ward_name_en, lb.name_en, b.name_en, sd.name_en, d.name_en, st.name_en, s.pincode),
  jsonb_build_object('state', st.name_en, 'district', d.name_en, 'subdistrict', sd.name_en, 'block', b.name_en, 'local_body', lb.name_en, 'ward', w.ward_name_en, 'village_code', s.lgd_village_code),
  jsonb_build_object('primary_pincode', s.pincode),
  now()
from public.geo_lgd_settlements s
left join public.geo_lgd_states st on st.lgd_state_code = s.lgd_state_code
left join public.geo_lgd_districts d on d.lgd_district_code = s.lgd_district_code
left join public.geo_lgd_subdistricts sd on sd.lgd_subdistrict_code = s.lgd_subdistrict_code
left join public.geo_lgd_blocks b on b.lgd_block_code = s.lgd_block_code
left join public.geo_lgd_local_bodies lb on lb.lgd_local_body_code = s.lgd_local_body_code
left join public.geo_lgd_wards w on w.lgd_ward_code = s.lgd_ward_code
where s.is_active = true
  and s.lgd_state_code = ${Number(stateCode)}
on conflict (settlement_key) do update set
  primary_pincode = excluded.primary_pincode,
  search_text = excluded.search_text,
  hierarchy_json = excluded.hierarchy_json,
  postal_json = excluded.postal_json,
  updated_at = now();
`;

const { error } = await supabase.rpc("exec_sql", { sql });

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Settlement intelligence populated for state code ${stateCode}`);
