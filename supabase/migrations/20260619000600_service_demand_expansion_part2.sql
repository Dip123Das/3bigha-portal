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
    ('soil-testing','Soil Testing'),
    ('site-survey','Site Survey'),
    ('land-measurement','Land Measurement'),
    ('building-plan','Building Plan'),
    ('structural-engineer','Structural Engineer'),
    ('construction-supervisor','Construction Supervisor'),
    ('estimator','Estimator'),
    ('valuation-service','Valuation Service'),
    ('property-documentation','Property Documentation'),
    ('mutation-consultant','Mutation Consultant'),
    ('loan-consultant','Loan Consultant'),
    ('vastu-consultant','Vastu Consultant'),
    ('home-cleaning','Home Cleaning'),
    ('pest-control','Pest Control'),
    ('water-tank-cleaning','Water Tank Cleaning'),
    ('solar-installation','Solar Installation')
) as svc(service_slug, service_name)
on conflict do nothing;