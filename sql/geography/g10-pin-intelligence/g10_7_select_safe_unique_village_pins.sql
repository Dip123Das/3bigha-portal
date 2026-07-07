-- G10.7 Select only safe village candidates:
-- exactly one unique PIN per village from canonical exact-match source.
-- No pincode update yet.

update public.geo_pin_match_candidates
set is_selected = false
where candidate_source = 'g10_canonical_post_office_exact_village_district_match';

with safe as (
  select
    geo_place_id,
    min(candidate_pincode) as safe_pincode
  from public.geo_pin_match_candidates
  where candidate_source = 'g10_canonical_post_office_exact_village_district_match'
  group by geo_place_id
  having count(distinct candidate_pincode) = 1
)
update public.geo_pin_match_candidates c
set is_selected = true
from safe s
where c.geo_place_id = s.geo_place_id
  and c.candidate_pincode = s.safe_pincode
  and c.candidate_source = 'g10_canonical_post_office_exact_village_district_match';

select
  count(*) as selected_candidate_rows,
  count(distinct geo_place_id) as selected_villages,
  count(distinct candidate_pincode) as selected_distinct_pins
from public.geo_pin_match_candidates
where candidate_source = 'g10_canonical_post_office_exact_village_district_match'
  and is_selected = true;

select
  lgd_district_code,
  district_name,
  count(distinct geo_place_id) as selected_villages
from public.geo_pin_match_candidates
where candidate_source = 'g10_canonical_post_office_exact_village_district_match'
  and is_selected = true
group by lgd_district_code, district_name
order by selected_villages desc
limit 30;
