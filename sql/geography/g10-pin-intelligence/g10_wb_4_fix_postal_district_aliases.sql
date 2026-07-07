update public.geo_wb_postal_district_aliases
set postal_normalized_district_name = 'dinajpurdakshin',
    notes = 'india post naming: DINAJPUR DAKSHIN'
where lgd_district_code = 310;

update public.geo_wb_postal_district_aliases
set postal_normalized_district_name = 'dinajpuruttar',
    notes = 'india post naming: DINAJPUR UTTAR'
where lgd_district_code = 311;

update public.geo_wb_postal_district_aliases
set postal_normalized_district_name = 'maldah',
    notes = 'india post naming: MALDAH'
where lgd_district_code = 316;

update public.geo_wb_postal_district_aliases
set postal_normalized_district_name = 'medinipureast',
    notes = 'india post naming: MEDINIPUR EAST'
where lgd_district_code = 317;

update public.geo_wb_postal_district_aliases
set postal_normalized_district_name = 'medinipurwest',
    notes = 'india post naming: MEDINIPUR WEST'
where lgd_district_code = 318;

select
  a.lgd_district_code,
  a.lgd_district_name,
  a.postal_normalized_district_name,
  count(pc.id) as canonical_post_offices,
  count(distinct pc.pincode) as unique_pins
from public.geo_wb_postal_district_aliases a
left join public.geo_post_offices_canonical pc
  on pc.normalized_district_name = a.postal_normalized_district_name
where a.is_active = true
group by a.lgd_district_code, a.lgd_district_name, a.postal_normalized_district_name
order by canonical_post_offices asc, a.lgd_district_name;
