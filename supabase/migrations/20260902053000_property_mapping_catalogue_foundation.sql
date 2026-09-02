do $mapping$
declare
  expected_mapping_count constant integer := 109;
begin
  create temporary table approved_property_mapping_catalogue (
    property_type_slug text not null,
    subtype_slug text not null,
    attribute_slug text not null,
    group_name text not null,
    mapping_sort_order integer not null,
    primary key (
      property_type_slug,
      subtype_slug,
      attribute_slug
    )
  ) on commit drop;

  -- Five residential building subtypes receive the common
  -- Areas, Configuration, Building and Parking groups.
  insert into approved_property_mapping_catalogue (
    property_type_slug,
    subtype_slug,
    attribute_slug,
    group_name,
    mapping_sort_order
  )
  select
    'houses',
    subtype.slug,
    attribute.slug,
    attribute.group_name,
    attribute.mapping_sort_order
  from (
    values
      ('flat-apartment'),
      ('independent-builder-floor'),
      ('independent-house-villa'),
      ('farm-house'),
      ('bunglow')
  ) as subtype(slug)
  cross join (
    values
      ('built-up-area',          'Areas',         100),
      ('carpet-area',            'Areas',         110),

      ('furnishing-status',      'Configuration', 200),
      ('bhk-configuration',      'Configuration', 210),
      ('bedrooms',               'Configuration', 220),
      ('bathrooms',              'Configuration', 230),
      ('kitchens',               'Configuration', 240),
      ('balconies',              'Configuration', 250),

      ('age-of-property',        'Building',      300),
      ('floor-number',           'Building',      310),
      ('total-floors',           'Building',      320),

      ('parking-type',           'Parking',       400),
      ('parking-spaces',         'Parking',       410)
  ) as attribute(
    slug,
    group_name,
    mapping_sort_order
  );

  -- Monthly Maintenance applies to managed or multi-unit
  -- residential building forms.
  insert into approved_property_mapping_catalogue (
    property_type_slug,
    subtype_slug,
    attribute_slug,
    group_name,
    mapping_sort_order
  )
  select
    'houses',
    subtype.slug,
    'monthly-maintenance',
    'Costs',
    500
  from (
    values
      ('flat-apartment'),
      ('independent-builder-floor'),
      ('independent-house-villa')
  ) as subtype(slug);

  -- Office Space and Shop receive building and commercial
  -- facility attributes.
  insert into approved_property_mapping_catalogue (
    property_type_slug,
    subtype_slug,
    attribute_slug,
    group_name,
    mapping_sort_order
  )
  select
    'houses',
    subtype.slug,
    attribute.slug,
    attribute.group_name,
    attribute.mapping_sort_order
  from (
    values
      ('office-space'),
      ('shop')
  ) as subtype(slug)
  cross join (
    values
      ('built-up-area',          'Areas',                  100),
      ('carpet-area',            'Areas',                  110),

      ('age-of-property',        'Building',               300),
      ('floor-number',           'Building',               310),
      ('total-floors',           'Building',               320),

      ('parking-type',           'Parking',                400),
      ('parking-spaces',         'Parking',                410),

      ('frontage-width',         'Commercial Facilities',  600),
      ('washroom-available',     'Commercial Facilities',  610),
      ('pantry-available',       'Commercial Facilities',  620),
      ('suitable-for',           'Commercial Facilities',  630),
      ('cabins-rooms',           'Commercial Facilities',  640),
      ('workstations',           'Commercial Facilities',  650),
      ('meeting-room-available', 'Commercial Facilities',  660),

      ('monthly-maintenance',    'Costs',                  700)
  ) as attribute(
    slug,
    group_name,
    mapping_sort_order
  );

  -- House(s) / Others receives common physical attributes.
  insert into approved_property_mapping_catalogue (
    property_type_slug,
    subtype_slug,
    attribute_slug,
    group_name,
    mapping_sort_order
  )
  select
    'houses',
    'others',
    attribute.slug,
    attribute.group_name,
    attribute.mapping_sort_order
  from (
    values
      ('built-up-area',      'Areas',    100),
      ('carpet-area',        'Areas',    110),

      ('age-of-property',    'Building', 300),
      ('floor-number',       'Building', 310),
      ('total-floors',       'Building', 320),

      ('parking-type',       'Parking',  400),
      ('parking-spaces',     'Parking',  410)
  ) as attribute(
    slug,
    group_name,
    mapping_sort_order
  );

  -- Commercial and Industrial plots receive supplemental
  -- commercial-use attributes. Core plot fields already
  -- exist directly on property_listings.
  insert into approved_property_mapping_catalogue (
    property_type_slug,
    subtype_slug,
    attribute_slug,
    group_name,
    mapping_sort_order
  )
  select
    'land-plot',
    subtype.slug,
    attribute.slug,
    'Commercial Use',
    attribute.mapping_sort_order
  from (
    values
      ('commercial'),
      ('industrial')
  ) as subtype(slug)
  cross join (
    values
      ('frontage-width', 100),
      ('suitable-for',   110)
  ) as attribute(
    slug,
    mapping_sort_order
  );

  if (
    select count(*)
    from approved_property_mapping_catalogue
  ) <> expected_mapping_count then
    raise exception
      'Guard failed: approved Property Mapping catalogue does not contain 109 rows.';
  end if;

  if (
    select count(*)
    from (
      values
        ('land-plot', 'residential'),
        ('land-plot', 'commercial'),
        ('land-plot', 'agricultural'),
        ('land-plot', 'industrial'),
        ('land-plot', 'others'),

        ('houses', 'flat-apartment'),
        ('houses', 'independent-builder-floor'),
        ('houses', 'independent-house-villa'),
        ('houses', 'farm-house'),
        ('houses', 'bunglow'),
        ('houses', 'office-space'),
        ('houses', 'shop'),
        ('houses', 'others')
    ) as expected(property_type_slug, subtype_slug)
    join public.property_types pt
      on pt.slug = expected.property_type_slug
    join public.property_subtypes ps
      on ps.type_id = pt.id
     and ps.slug = expected.subtype_slug
    where pt.is_active = true
      and ps.is_active = true
  ) <> 13 then
    raise exception
      'Guard failed: the 13 audited active property subtypes differ.';
  end if;

  if exists (
    select 1
    from (
      values
        ('built-up-area',          'number'),
        ('carpet-area',            'number'),
        ('furnishing-status',      'single_select'),
        ('parking-type',           'single_select'),
        ('parking-spaces',         'number'),
        ('age-of-property',        'number'),
        ('bhk-configuration',      'single_select'),
        ('bedrooms',               'number'),
        ('bathrooms',              'number'),
        ('kitchens',               'number'),
        ('balconies',              'number'),
        ('floor-number',           'number'),
        ('total-floors',           'number'),
        ('monthly-maintenance',    'number'),
        ('frontage-width',         'number'),
        ('washroom-available',     'boolean'),
        ('pantry-available',       'boolean'),
        ('suitable-for',           'multi_select'),
        ('cabins-rooms',           'number'),
        ('workstations',           'number'),
        ('meeting-room-available', 'boolean')
    ) as expected(attribute_slug, input_type)
    left join public.property_attributes pa
      on pa.slug = expected.attribute_slug
    where pa.id is null
       or pa.is_active is distinct from true
       or pa.input_type <> expected.input_type
  ) then
    raise exception
      'Guard failed: the 21 approved active Property Attributes differ.';
  end if;

  if exists (
    select 1
    from approved_property_mapping_catalogue catalogue
    left join public.property_types pt
      on pt.slug = catalogue.property_type_slug
    left join public.property_subtypes ps
      on ps.type_id = pt.id
     and ps.slug = catalogue.subtype_slug
    left join public.property_attributes pa
      on pa.slug = catalogue.attribute_slug
    where pt.id is null
       or ps.id is null
       or pa.id is null
  ) then
    raise exception
      'Guard failed: an approved Property Mapping target cannot be resolved.';
  end if;

  insert into public.property_subtype_attributes (
    subtype_id,
    attribute_id,
    is_required,
    sort_order,
    is_filterable,
    group_name
  )
  select
    ps.id,
    pa.id,
    false,
    catalogue.mapping_sort_order,
    true,
    catalogue.group_name
  from approved_property_mapping_catalogue catalogue
  join public.property_types pt
    on pt.slug = catalogue.property_type_slug
  join public.property_subtypes ps
    on ps.type_id = pt.id
   and ps.slug = catalogue.subtype_slug
  join public.property_attributes pa
    on pa.slug = catalogue.attribute_slug
  where not exists (
    select 1
    from public.property_subtype_attributes existing
    where existing.subtype_id = ps.id
      and existing.attribute_id = pa.id
  );
end
$mapping$;