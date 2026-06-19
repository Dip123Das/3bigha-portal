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
    ('cement','Cement'),
    ('tmt-bar','TMT Bar'),
    ('bricks','Bricks'),
    ('sand','Sand'),
    ('stone-chips','Stone Chips'),
    ('aggregate','Aggregate'),
    ('ready-mix-concrete','Ready Mix Concrete'),
    ('rcc-hume-pipe','RCC Hume Pipe'),
    ('pvc-pipe','PVC Pipe'),
    ('cpvc-pipe','CPVC Pipe'),
    ('water-tank','Water Tank'),
    ('tiles','Tiles'),
    ('paint','Paint'),
    ('electrical-wire','Electrical Wire'),
    ('plumbing-material','Plumbing Material'),
    ('door','Door'),
    ('window','Window'),
    ('plywood','Plywood'),
    ('shuttering-material','Shuttering Material'),
    ('roofing-sheet','Roofing Sheet')
) as mat(material_slug, material_name)
on conflict do nothing;