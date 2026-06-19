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
    'Buyers and investors in ',
    p.name,
    ' are searching for ',
    lower(property_name),
    ' sellers. Join 3Bigha as a property seller and receive local buyer demand opportunities.'
  ),
  true
from geo_places p
cross join (
  values
    ('plot-near-main-road','Plot Near Main Road'),
    ('corner-land','Corner Land'),
    ('bastu-land','Bastu Land'),
    ('settlement-land','Settlement Land'),
    ('school-nearby-land','School Nearby Land'),
    ('market-nearby-land','Market Nearby Land'),
    ('hospital-nearby-land','Hospital Nearby Land'),
    ('highway-side-land','Highway Side Land'),
    ('small-budget-land','Small Budget Land'),
    ('two-katha-plot','Two Katha Plot'),
    ('three-katha-plot','Three Katha Plot'),
    ('four-katha-plot','Four Katha Plot'),
    ('five-katha-plot','Five Katha Plot'),
    ('ready-to-register-land','Ready To Register Land'),
    ('boundary-wall-land','Boundary Wall Land'),
    ('land-for-house-construction','Land For House Construction')
) as prop(property_slug, property_name)
on conflict do nothing;