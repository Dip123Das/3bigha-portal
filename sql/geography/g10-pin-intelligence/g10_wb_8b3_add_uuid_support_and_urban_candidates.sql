-- Add UUID support for geo_places candidates
alter table public.geo_pin_match_candidates
add column if not exists geo_place_uuid uuid;

create index if not exists idx_geo_pin_match_candidates_place_uuid
on public.geo_pin_match_candidates (geo_place_uuid);

delete from public.geo_pin_match_candidates
where candidate_source = 'g10_wb_urban_exact_name_post_office_match';

insert into public.geo_pin_match_candidates (
  geo_place_id,
  geo_place_uuid,
  lgd_state_code,
  lgd_district_code,
  state_name,
  district_name,
  place_name,
  settlement_type,
  candidate_pincode,
  candidate_source,
  confidence_score,
  confidence_reason
)
select
  null,
  gp.id,
  '19',
  a.lgd_district_code::text,
  'West Bengal',
  a.lgd_district_name,
  gp.name,
  upper(gp.place_type),
  pc.pincode,
  'g10_wb_urban_exact_name_post_office_match',
  96,
  concat(
    'WB urban exact normalized name match with canonical post office; office=',
    pc.office_name,
    '; postal district=',
    pc.district_name
  )
from public.geo_places gp
join public.geo_districts gd
  on gd.id = gp.district_id
join public.geo_wb_postal_district_aliases a
  on a.lgd_district_code::text = gd.lgd_code
join public.geo_post_offices_canonical pc
  on pc.normalized_district_name = a.postal_normalized_district_name
 and pc.normalized_office_name = lower(regexp_replace(gp.name, '[^a-zA-Z0-9]+', '', 'g'))
where gp.is_active = true
  and a.is_active = true
  and gp.place_type in (
    'town',
    'city',
    'municipality',
    'municipal_corporation',
    'municipal_council',
    'nagar_panchayat',
    'urban_local_body',
    'town_local_body',
    'cantonment'
  )
  and nullif(trim(coalesce(gp.pincode, '')), '') is null
  and pc.pincode ~ '^[0-9]{6}$';

select
  count(*) as total_candidate_rows,
  count(distinct geo_place_uuid) as urban_places_with_candidates,
  count(distinct candidate_pincode) as distinct_pins
from public.geo_pin_match_candidates
where candidate_source = 'g10_wb_urban_exact_name_post_office_match';

select count(*) as urban_places_with_one_unique_pin
from (
  select geo_place_uuid
  from public.geo_pin_match_candidates
  where candidate_source = 'g10_wb_urban_exact_name_post_office_match'
  group by geo_place_uuid
  having count(distinct candidate_pincode) = 1
) x;

select count(*) as urban_places_with_multiple_unique_pins
from (
  select geo_place_uuid
  from public.geo_pin_match_candidates
  where candidate_source = 'g10_wb_urban_exact_name_post_office_match'
  group by geo_place_uuid
  having count(distinct candidate_pincode) > 1
) x;
