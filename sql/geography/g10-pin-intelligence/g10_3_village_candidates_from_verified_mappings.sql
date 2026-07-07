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
  null,
  d.name_en,
  v.name_en,
  'VILLAGE',
  trim(lp.pincode::text),
  lp.source,
  case
    when lp.confidence ilike '%manual%' then 100
    when lp.confidence ilike '%exact%' then 98
    when lp.confidence ilike '%high%' then 95
    when lp.confidence ilike '%medium%' then 85
    else 75
  end,
  concat(
    'Existing geo_lgd_place_pincodes village-code mapping; confidence=',
    coalesce(lp.confidence, 'unknown'),
    '; source=',
    coalesce(lp.source, 'unknown')
  )
from public.geo_lgd_villages v
join public.geo_lgd_place_pincodes lp
  on lp.lgd_village_code = v.lgd_village_code
left join public.geo_lgd_districts d
  on d.lgd_district_code = v.lgd_district_code
where v.is_active = true
  and nullif(trim(coalesce(v.pincode, '')), '') is null
  and trim(lp.pincode::text) ~ '^[0-9]{6}$'
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
      and c.candidate_pincode = trim(lp.pincode::text)
      and c.candidate_source = lp.source
  );

select
  candidate_source,
  confidence_score,
  count(*) as candidates
from public.geo_pin_match_candidates
where settlement_type = 'VILLAGE'
group by candidate_source, confidence_score
order by confidence_score desc, candidates desc;
