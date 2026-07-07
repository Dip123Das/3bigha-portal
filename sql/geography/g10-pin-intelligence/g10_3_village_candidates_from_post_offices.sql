-- G10.3 Revised
-- Generate auditable village PIN candidates from geo_post_offices.
-- No village table update here.

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
  v.id as geo_place_id,
  d.lgd_state_code::text as lgd_state_code,
  v.lgd_district_code::text as lgd_district_code,
  po.state_name,
  d.name_en as district_name,
  v.name_en as place_name,
  'VILLAGE' as settlement_type,
  trim(po.pincode) as candidate_pincode,
  'g10_post_office_exact_village_district_match' as candidate_source,
  96 as confidence_score,
  concat(
    'Exact normalized village name = post office name within district; office=',
    po.office_name,
    '; post_district=',
    po.district_name
  ) as confidence_reason
from public.geo_lgd_villages v
join public.geo_lgd_districts d
  on d.lgd_district_code = v.lgd_district_code
join public.geo_post_offices po
  on lower(regexp_replace(po.district_name, '[^a-zA-Z0-9]+', '', 'g'))
   = lower(regexp_replace(d.name_en, '[^a-zA-Z0-9]+', '', 'g'))
 and lower(regexp_replace(po.office_name, '\s*(B\.?O\.?|S\.?O\.?|H\.?O\.?)$', '', 'i'))
   = lower(v.name_en)
where v.is_active = true
  and nullif(trim(coalesce(v.pincode, '')), '') is null
  and trim(po.pincode) ~ '^[0-9]{6}$'
  and not exists (
    select 1
    from public.geo_pin_manual_overrides mo
    where mo.geo_place_id = v.id
      and mo.is_active = true
  )
  and not exists (
    select 1
    from public.geo_pin_match_candidates c
    where c.geo_place_id = v.id
      and c.candidate_pincode = trim(po.pincode)
      and c.candidate_source = 'g10_post_office_exact_village_district_match'
  );

select
  candidate_source,
  confidence_score,
  count(*) as candidates
from public.geo_pin_match_candidates
where settlement_type = 'VILLAGE'
group by candidate_source, confidence_score
order by confidence_score desc, candidates desc;
