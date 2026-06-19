insert into vendor_opportunity_seo
(
  slug,
  seo_title,
  seo_description,
  is_indexable
)
select distinct
  concat(
    'service-provider-',
    service_slug,
    '-',
    p.slug
  ),
  concat(
    'Need ',
    service_name,
    ' Service Providers in ',
    p.name
  ),
  concat(
    'House owners, builders and businesses in ',
    p.name,
    ' are searching for ',
    lower(service_name),
    ' service providers. Join 3Bigha as a service provider and receive local buyer demand opportunities.'
  ),
  true
from geo_places p
cross join (
  values
    ('electrician','Electrician'),
    ('plumber','Plumber'),
    ('civil-contractor','Civil Contractor'),
    ('raj-mistri','Raj Mistri'),
    ('mason','Mason'),
    ('painter','Painter'),
    ('carpenter','Carpenter'),
    ('tiles-mistri','Tiles Mistri'),
    ('marble-mistri','Marble Mistri'),
    ('grill-mistri','Grill Mistri'),
    ('welder','Welder'),
    ('aluminium-fabricator','Aluminium Fabricator'),
    ('labour-contractor','Labour Contractor'),
    ('house-construction-contractor','House Construction Contractor'),
    ('roof-casting-contractor','Roof Casting Contractor'),
    ('earthwork-contractor','Earthwork Contractor'),
    ('boundary-wall-contractor','Boundary Wall Contractor'),
    ('boring-service','Boring Service'),
    ('waterproofing-contractor','Waterproofing Contractor'),
    ('interior-contractor','Interior Contractor')
) as svc(service_slug, service_name)
on conflict do nothing;