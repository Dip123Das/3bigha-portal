-- G10.8 Apply selected village PINs.
-- Only updates villages with blank pincode.
-- Manual overrides remain protected.

with selected as (
  select
    geo_place_id,
    candidate_pincode,
    candidate_source,
    confidence_score,
    confidence_reason
  from public.geo_pin_match_candidates
  where candidate_source = 'g10_canonical_post_office_exact_village_district_match'
    and is_selected = true
),
to_update as (
  select
    v.id,
    v.pincode as old_pincode,
    s.candidate_pincode,
    s.candidate_source,
    s.confidence_score,
    s.confidence_reason
  from public.geo_lgd_villages v
  join selected s
    on s.geo_place_id = v.id
  where nullif(trim(coalesce(v.pincode, '')), '') is null
    and not exists (
      select 1
      from public.geo_pin_manual_overrides mo
      where mo.geo_place_id = v.id
        and mo.is_active = true
    )
)
insert into public.geo_pin_assignment_log (
  geo_place_id,
  old_pincode,
  new_pincode,
  assignment_source,
  confidence_score,
  assignment_reason
)
select
  id,
  old_pincode,
  candidate_pincode,
  candidate_source,
  confidence_score,
  confidence_reason
from to_update;

with selected as (
  select geo_place_id, candidate_pincode
  from public.geo_pin_match_candidates
  where candidate_source = 'g10_canonical_post_office_exact_village_district_match'
    and is_selected = true
)
update public.geo_lgd_villages v
set
  pincode = s.candidate_pincode,
  updated_at = now()
from selected s
where s.geo_place_id = v.id
  and nullif(trim(coalesce(v.pincode, '')), '') is null
  and not exists (
    select 1
    from public.geo_pin_manual_overrides mo
    where mo.geo_place_id = v.id
      and mo.is_active = true
  );

select
  count(*) as village_pins_applied
from public.geo_pin_assignment_log
where assignment_source = 'g10_canonical_post_office_exact_village_district_match';

select
  count(*) as villages_total,
  count(*) filter (where nullif(trim(coalesce(pincode, '')), '') is not null) as villages_with_pin,
  count(*) filter (where nullif(trim(coalesce(pincode, '')), '') is null) as villages_without_pin
from public.geo_lgd_villages
where is_active = true;
