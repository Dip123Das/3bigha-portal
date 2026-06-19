insert into vendor_opportunity_seo
(
  slug,
  seo_title,
  seo_description,
  is_indexable
)
select distinct
  concat(
    'building-material-supplier-',
    material_slug,
    '-',
    p.slug
  ),
  concat(
    'Need ',
    material_name,
    ' Suppliers in ',
    p.name
  ),
  concat(
    'Builders, contractors and house owners in ',
    p.name,
    ' are searching for ',
    lower(material_name),
    ' suppliers. Join 3Bigha as a building material supplier and receive local buyer demand opportunities.'
  ),
  true
from geo_places p
cross join (
  values
    ('river-sand','River Sand'),
    ('coarse-sand','Coarse Sand'),
    ('fine-sand','Fine Sand'),
    ('stone-dust','Stone Dust'),
    ('stone-boulder','Stone Boulder'),
    ('red-bricks','Red Bricks'),
    ('fly-ash-bricks','Fly Ash Bricks'),
    ('paver-block','Paver Block'),
    ('cement-block','Cement Block'),
    ('concrete-block','Concrete Block'),
    ('ms-rod','MS Rod'),
    ('binding-wire','Binding Wire'),
    ('gi-pipe','GI Pipe'),
    ('ms-pipe','MS Pipe'),
    ('angle-channel','Angle Channel'),
    ('glass','Glass'),
    ('sanitaryware','Sanitaryware'),
    ('bathroom-fittings','Bathroom Fittings')
) as mat(material_slug, material_name)
on conflict do nothing;