-- G10.6 Rebuild village candidates from canonical post offices.
-- This clears only the old G10 exact-match source and rebuilds from canonical data.

delete from public.geo_pin_match_candidates
where candidate_source in (
  'g10_post_office_exact_village_district_match',
  'g10_canonical_post_office_exact_village_district_match'
);

insert into public.geo_pin_match_candidates (
  geo_place_id,
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
  v.id,
  d.lgd_state_code::text,
  v.lgd_district_code::text,
  pc.state_name,
  d.name_en,
  v.name_en,
  'VILLAGE',
  pc.pincode,
  'g10_canonical_post_office_exact_village_district_match',
  96,
  concat(
    'Canonical exact match: normalized village name = normalized post office name within district; office=',
    pc.office_name,
    '; source_rows=',
    pc.source_rows
  )
from public.geo_lgd_villages v
join public.geo_lgd_districts d
  on d.lgd_district_code = v.lgd_district_code
join public.geo_post_offices_canonical pc
  on pc.normalized_district_name = lower(regexp_replace(d.name_en, '[^a-zA-Z0-9]+', '', 'g'))
 and pc.normalized_office_name = lower(regexp_replace(v.name_en, '[^a-zA-Z0-9]+', '', 'g'))
where v.is_active = true
  and nullif(trim(coalesce(v.pincode, '')), '') is null
  and pc.pincode ~ '^[0-9]{6}$'
  and not exists (
    select 1
    from public.geo_pin_manual_overrides mo
    where mo.geo_place_id = v.id
      and mo.is_active = true
  );

select
  count(*) as total_candidate_rows,
  count(distinct geo_place_id) as villages_with_candidates,
  count(distinct candidate_pincode) as distinct_pins
from public.geo_pin_match_candidates
where candidate_source = 'g10_canonical_post_office_exact_village_district_match';

select count(*) as villages_with_one_unique_pin
from (
  select geo_place_id
  from public.geo_pin_match_candidates
  where candidate_source = 'g10_canonical_post_office_exact_village_district_match'
  group by geo_place_id
  having count(distinct candidate_pincode) = 1
) x;

select count(*) as villages_with_multiple_unique_pins
from (
  select geo_place_id
  from public.geo_pin_match_candidates
  where candidate_source = 'g10_canonical_post_office_exact_village_district_match'
  group by geo_place_id
  having count(distinct candidate_pincode) > 1
) x;
