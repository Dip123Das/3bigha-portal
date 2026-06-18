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
    'Construction projects in ',
    p.name,
    ' require ',
    equipment_name,
    ' rental providers. Join 3Bigha as a rental vendor and receive local demand opportunities.'
  ),
  true
from geo_places p
cross join (
  values
    ('jcb','JCB'),
    ('excavator','Excavator'),
    ('concrete-mixer','Concrete Mixer'),
    ('transit-mixer','Transit Mixer'),
    ('road-roller','Road Roller'),
    ('scaffolding','Scaffolding'),
    ('shuttering','Shuttering'),
    ('generator','Generator'),
    ('earth-cutting-machine','Earth Cutting Machine'),
    ('construction-equipment','Construction Equipment')
) as eq(equipment_slug,equipment_name)
on conflict do nothing;