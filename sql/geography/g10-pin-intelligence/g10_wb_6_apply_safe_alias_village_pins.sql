update public.geo_pin_match_candidates
set is_selected = false
where candidate_source = 'g10_wb_alias_exact_village_post_office_match';

with safe as (
  select
    geo_place_id,
    min(candidate_pincode) as safe_pincode
  from public.geo_pin_match_candidates
  where candidate_source = 'g10_wb_alias_exact_village_post_office_match'
  group by geo_place_id
  having count(distinct candidate_pincode) = 1
)
update public.geo_pin_match_candidates c
set is_selected = true
from safe s
where c.geo_place_id = s.geo_place_id
  and c.candidate_pincode = s.safe_pincode
  and c.candidate_source = 'g10_wb_alias_exact_village_post_office_match';

with selected as (
  select
    geo_place_id,
    candidate_pincode,
    candidate_source,
    confidence_score,
    confidence_reason
  from public.geo_pin_match_candidates
  where candidate_source = 'g10_wb_alias_exact_village_post_office_match'
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
  where v.lgd_district_code in (
    select lgd_district_code
    from public.geo_wb_postal_district_aliases
    where is_active = true
  )
    and nullif(trim(coalesce(v.pincode, '')), '') is null
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
  where candidate_source = 'g10_wb_alias_exact_village_post_office_match'
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

update public.geo_places gp
set
  pincode = v.pincode,
  updated_at = now()
from public.geo_lgd_villages v
where gp.lgd_code = v.lgd_village_code::text
  and gp.place_type = 'village'
  and gp.is_active = true
  and v.is_active = true
  and nullif(trim(coalesce(gp.pincode, '')), '') is null
  and nullif(trim(coalesce(v.pincode, '')), '') is not null;

select
  count(*) as wb_alias_village_pins_applied
from public.geo_pin_assignment_log
where assignment_source = 'g10_wb_alias_exact_village_post_office_match';

select
  d.lgd_district_code,
  d.name_en as district,
  count(*) as total_villages,
  count(*) filter (where nullif(trim(coalesce(v.pincode, '')), '') is not null) as with_pin,
  count(*) filter (where nullif(trim(coalesce(v.pincode, '')), '') is null) as without_pin
from public.geo_lgd_villages v
join public.geo_lgd_districts d
  on d.lgd_district_code = v.lgd_district_code
where d.lgd_state_code = 19
  and v.is_active = true
group by d.lgd_district_code, d.name_en
order by without_pin desc;
