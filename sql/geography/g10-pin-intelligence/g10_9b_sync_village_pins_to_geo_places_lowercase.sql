-- G10.9B Corrected sync: geo_places uses lowercase place_type = 'village'

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
  count(*) as geo_places_villages_total,
  count(*) filter (where nullif(trim(coalesce(pincode, '')), '') is not null) as geo_places_villages_with_pin,
  count(*) filter (where nullif(trim(coalesce(pincode, '')), '') is null) as geo_places_villages_without_pin
from public.geo_places
where place_type = 'village'
  and is_active = true;
