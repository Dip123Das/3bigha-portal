insert into vendor_opportunity_seo
(
  slug,
  seo_title,
  seo_description,
  is_indexable
)
select distinct
  concat(
    'property-seller-',
    property_slug,
    '-',
    p.slug
  ),
  concat(
    'Need ',
    property_name,
    ' Sellers in ',
    p.name
  ),
  concat(
    'Buyers in ',
    p.name,
    ' are searching for ',
    lower(property_name),
    ' sellers. Join 3Bigha as a property seller and receive local buyer demand opportunities.'
  ),
  true
from geo_places p
cross join (
  values
    ('residential-plot','Residential Plot'),
    ('commercial-land','Commercial Land'),
    ('house','House'),
    ('flat','Flat'),
    ('shop','Shop'),
    ('godown','Godown'),
    ('warehouse','Warehouse'),
    ('agricultural-land','Agricultural Land'),
    ('corner-plot','Corner Plot'),
    ('roadside-land','Roadside Land'),
    ('land-near-town','Land Near Town'),
    ('ready-house','Ready House'),
    ('low-budget-plot','Low Budget Plot'),
    ('investment-land','Investment Land'),
    ('mutation-ready-land','Mutation Ready Land')
) as prop(property_slug, property_name)
on conflict do nothing;