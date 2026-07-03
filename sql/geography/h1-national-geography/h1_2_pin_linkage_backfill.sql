-- H1.2 PIN linkage backfill
-- Backfills geo_lgd_settlements and geo_settlement_postal from selected village PIN assignments.

update public.geo_lgd_settlements s
set
  pincode = v.pincode,
  updated_at = now()
from public.geo_lgd_villages v
where s.lgd_village_code = v.lgd_village_code
  and nullif(trim(coalesce(v.pincode, '')), '') is not null
  and (
    s.pincode is null
    or trim(s.pincode) = ''
    or s.pincode <> v.pincode
  );

insert into public.geo_lgd_settlements (
  settlement_key,
  settlement_type,
  name_en,
  name_local,
  display_name,
  slug,
  lgd_state_code,
  lgd_district_code,
  lgd_subdistrict_code,
  lgd_block_code,
  lgd_village_code,
  source_table,
  source,
  is_active,
  pincode,
  updated_at
)
select
  'village:' || v.lgd_village_code,
  'VILLAGE',
  v.name_en,
  v.name_local,
  v.name_en,
  v.slug,
  d.lgd_state_code,
  v.lgd_district_code,
  v.lgd_subdistrict_code,
  v.lgd_block_code,
  v.lgd_village_code,
  'geo_lgd_villages',
  'LGD',
  true,
  v.pincode,
  now()
from public.geo_lgd_villages v
join public.geo_lgd_districts d
  on d.lgd_district_code = v.lgd_district_code
left join public.geo_lgd_settlements s
  on s.lgd_village_code = v.lgd_village_code
where nullif(trim(coalesce(v.pincode, '')), '') is not null
  and s.id is null
on conflict (settlement_key) do update set
  pincode = excluded.pincode,
  updated_at = now();

insert into public.geo_settlement_postal (
  settlement_key,
  pincode,
  confidence,
  match_method,
  source,
  updated_at
)
select
  s.settlement_key,
  s.pincode,
  96,
  'village_settlement_pin_sync',
  'h1_2_settlement_postal_backfill',
  now()
from public.geo_lgd_settlements s
where s.lgd_village_code is not null
  and nullif(trim(coalesce(s.pincode, '')), '') is not null
on conflict (settlement_key, pincode) do update set
  confidence = excluded.confidence,
  match_method = excluded.match_method,
  source = excluded.source,
  updated_at = now();
