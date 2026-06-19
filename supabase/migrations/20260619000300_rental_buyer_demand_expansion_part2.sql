insert into vendor_opportunity_seo
(
  slug,
  seo_title,
  seo_description,
  is_indexable
)
select distinct
  concat(
    'rental-provider-',
    equipment_slug,
    '-',
    p.slug
  ),
  concat(
    'Need ',
    equipment_name,
    ' Rental Providers in ',
    p.name
  ),
  concat(
    'Builders, contractors and project owners in ',
    p.name,
    ' are searching for ',
    lower(equipment_name),
    ' rental providers. Join 3Bigha and receive local rental demand opportunities.'
  ),
  true
from geo_places p
cross join (
  values
    ('tower-crane','Tower Crane'),
    ('mobile-crane','Mobile Crane'),
    ('hydra-crane','Hydra Crane'),
    ('boom-lift','Boom Lift'),
    ('scissor-lift','Scissor Lift'),
    ('forklift','Forklift'),
    ('backhoe-loader','Backhoe Loader'),
    ('soil-compactor','Soil Compactor'),
    ('vibratory-roller','Vibratory Roller'),
    ('plate-compactor','Plate Compactor'),
    ('concrete-pump','Concrete Pump'),
    ('bar-bending-machine','Bar Bending Machine'),
    ('bar-cutting-machine','Bar Cutting Machine'),
    ('power-trowel','Power Trowel'),
    ('dewatering-pump','Dewatering Pump'),
    ('diesel-generator','Diesel Generator'),
    ('air-compressor','Air Compressor'),
    ('welding-machine','Welding Machine'),
    ('water-tanker','Water Tanker'),
    ('tipper-truck','Tipper Truck')
) as eq(equipment_slug,equipment_name)
on conflict do nothing;