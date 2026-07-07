-- G10-WB.7B: Urban PIN evidence from WB postal district aliases
-- Evidence only. No urban update.

drop table if exists public.geo_wb_urban_district_pin_evidence;

create table public.geo_wb_urban_district_pin_evidence as
select
  a.lgd_district_code,
  a.lgd_district_name,
  pc.pincode,
  count(*) as post_office_count,
  count(*) filter (where lower(coalesce(pc.office_type, '')) like '%h.o%') as head_offices,
  count(*) filter (where lower(coalesce(pc.office_type, '')) like '%s.o%') as sub_offices,
  count(*) filter (where lower(coalesce(pc.office_type, '')) like '%b.o%') as branch_offices
from public.geo_wb_postal_district_aliases a
join public.geo_post_offices_canonical pc
  on pc.normalized_district_name = a.postal_normalized_district_name
where a.is_active = true
group by a.lgd_district_code, a.lgd_district_name, pc.pincode;

select
  lgd_district_code,
  lgd_district_name,
  count(distinct pincode) as district_unique_pins,
  sum(post_office_count) as post_offices
from public.geo_wb_urban_district_pin_evidence
group by lgd_district_code, lgd_district_name
order by district_unique_pins desc, lgd_district_name;

select
  place_type,
  count(*) as urban_places,
  count(*) filter (where nullif(trim(coalesce(pincode, '')), '') is not null) as with_pin,
  count(*) filter (where nullif(trim(coalesce(pincode, '')), '') is null) as without_pin
from public.geo_places
where place_type in (
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
group by place_type
order by urban_places desc;
