create table if not exists public.geo_wb_postal_district_aliases (
  id bigserial primary key,
  lgd_district_code integer not null,
  lgd_district_name text not null,
  lgd_normalized text not null,
  postal_normalized_district_name text not null,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

truncate table public.geo_wb_postal_district_aliases;

insert into public.geo_wb_postal_district_aliases
(lgd_district_code, lgd_district_name, lgd_normalized, postal_normalized_district_name, notes)
values
(664, 'Alipurduar', 'alipurduar', 'alipurduar', 'direct'),
(305, 'Bankura', 'bankura', 'bankura', 'direct'),
(307, 'Birbhum', 'birbhum', 'birbhum', 'direct'),
(308, 'Cooch Behar', 'coochbehar', 'coochbehar', 'direct'),
(310, 'Dakshin Dinajpur', 'dakshindinajpur', 'dakshindinajpur', 'direct'),
(309, 'Darjeeling', 'darjeeling', 'darjeeling', 'direct'),
(312, 'Hooghly', 'hooghly', 'hooghly', 'direct'),
(313, 'Howrah', 'howrah', 'howrah', 'direct'),
(314, 'Jalpaiguri', 'jalpaiguri', 'jalpaiguri', 'direct'),
(703, 'Jhargram', 'jhargram', 'jhargram', 'direct'),
(702, 'Kalimpong', 'kalimpong', 'kalimpong', 'direct'),
(315, 'Kolkata', 'kolkata', 'kolkata', 'direct'),
(316, 'Malda', 'malda', 'malda', 'direct'),
(319, 'Murshidabad', 'murshidabad', 'murshidabad', 'direct'),
(320, 'Nadia', 'nadia', 'nadia', 'direct'),
(303, 'North 24 Parganas', 'north24parganas', '24paraganasnorth', 'india post naming'),
(704, 'Paschim Bardhaman', 'paschimbardhaman', 'paschimbardhaman', 'direct'),
(318, 'Paschim Medinipur', 'paschimmedinipur', 'paschimmedinipur', 'direct'),
(306, 'Purba Bardhaman', 'purbabardhaman', 'purbabardhaman', 'direct'),
(317, 'Purba Medinipur', 'purbamedinipur', 'purbamedinipur', 'direct'),
(321, 'Purulia', 'purulia', 'purulia', 'direct'),
(304, 'South 24 Parganas', 'south24paraganas', '24paraganassouth', 'india post naming'),
(311, 'Uttar Dinajpur', 'uttardinajpur', 'uttardinajpur', 'direct');

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
