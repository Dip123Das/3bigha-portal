begin;

alter table public.property_attribute_values
  add column if not exists description text;

update public.property_attribute_values
set
  sort_order = coalesce(sort_order, 1000),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  sort_order is null
  or created_at is null
  or updated_at is null;

do $$
begin
  if exists (
    select 1
    from public.property_attribute_values
    where slug is null
       or btrim(slug) = ''
  ) then
    raise exception
      'Guard failed: an existing property value has no permanent key.';
  end if;
end
$$;

alter table public.property_attribute_values
  alter column slug set not null,
  alter column sort_order set default 1000,
  alter column sort_order set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.property_attribute_values
  drop constraint if exists property_attribute_values_value_not_blank;

alter table public.property_attribute_values
  add constraint property_attribute_values_value_not_blank
  check (length(btrim(value)) > 0);

alter table public.property_attribute_values
  drop constraint if exists property_attribute_values_slug_not_blank;

alter table public.property_attribute_values
  add constraint property_attribute_values_slug_not_blank
  check (length(btrim(slug)) > 0);

alter table public.property_attribute_values
  drop constraint if exists property_attribute_values_description_length;

alter table public.property_attribute_values
  add constraint property_attribute_values_description_length
  check (description is null or length(description) <= 600);

create unique index if not exists
  property_attribute_values_attribute_normalized_value_uidx
on public.property_attribute_values (
  attribute_id,
  lower(btrim(value))
);

create unique index if not exists
  property_attribute_values_attribute_normalized_slug_uidx
on public.property_attribute_values (
  attribute_id,
  lower(btrim(slug))
);

create or replace function public.touch_property_attribute_value_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_property_attribute_values_updated_at
  on public.property_attribute_values;

create trigger touch_property_attribute_values_updated_at
before update on public.property_attribute_values
for each row
execute function public.touch_property_attribute_value_updated_at();

comment on column public.property_attribute_values.slug is
  'Permanent machine key within its property attribute. It must not be changed after creation.';

comment on column public.property_attribute_values.description is
  'Administrator-reviewed explanation of the controlled property value.';

create temporary table approved_property_value_catalogue (
  attribute_slug text not null,
  value_label text not null,
  value_slug text not null,
  description text not null,
  sort_order integer not null
) on commit drop;

insert into approved_property_value_catalogue (
  attribute_slug,
  value_label,
  value_slug,
  description,
  sort_order
)
values
  (
    'furnishing-status',
    'Unfurnished',
    'unfurnished',
    'The property is offered without movable furniture and may contain only basic permanent fixtures.',
    100
  ),
  (
    'furnishing-status',
    'Semi-Furnished',
    'semi-furnished',
    'The property includes some essential fixtures or furniture but is not completely equipped for immediate occupancy.',
    200
  ),
  (
    'furnishing-status',
    'Fully Furnished',
    'fully-furnished',
    'The property includes substantial furniture and essential fittings intended to support immediate occupancy.',
    300
  ),
  (
    'furnishing-status',
    'Bare Shell',
    'bare-shell',
    'The property has an unfinished internal space with limited finishes, fittings or services installed.',
    400
  ),
  (
    'furnishing-status',
    'Warm Shell',
    'warm-shell',
    'The property includes basic internal finishes and building services but requires tenant-specific fit-out.',
    500
  ),

  (
    'parking-type',
    'Open Parking',
    'open-parking',
    'Parking is provided in an uncovered designated area within or adjoining the property.',
    100
  ),
  (
    'parking-type',
    'Covered Parking',
    'covered-parking',
    'Parking is provided under a permanent or designated covered structure.',
    200
  ),
  (
    'parking-type',
    'Basement Parking',
    'basement-parking',
    'Parking is located in a basement or underground level of the property.',
    300
  ),
  (
    'parking-type',
    'Stilt Parking',
    'stilt-parking',
    'Parking is provided at the open ground level beneath an elevated building structure.',
    400
  ),
  (
    'parking-type',
    'Private Garage',
    'private-garage',
    'Parking is provided in an enclosed garage reserved for the property or unit.',
    500
  ),
  (
    'parking-type',
    'Mechanical / Stack Parking',
    'mechanical-stack-parking',
    'Parking uses a mechanical lift, stack or automated arrangement to accommodate vehicles.',
    600
  ),

  (
    'bhk-configuration',
    '1 RK',
    '1-rk',
    'The property has one room with a kitchen area and no separately identified bedroom.',
    100
  ),
  (
    'bhk-configuration',
    '1 BHK',
    '1-bhk',
    'The property has one bedroom, one hall or living area and one kitchen.',
    200
  ),
  (
    'bhk-configuration',
    '2 BHK',
    '2-bhk',
    'The property has two bedrooms, a hall or living area and a kitchen.',
    300
  ),
  (
    'bhk-configuration',
    '3 BHK',
    '3-bhk',
    'The property has three bedrooms, a hall or living area and a kitchen.',
    400
  ),
  (
    'bhk-configuration',
    '4 BHK',
    '4-bhk',
    'The property has four bedrooms, a hall or living area and a kitchen.',
    500
  ),
  (
    'bhk-configuration',
    '5 BHK',
    '5-bhk',
    'The property has five bedrooms, a hall or living area and a kitchen.',
    600
  ),
  (
    'bhk-configuration',
    '6+ BHK',
    '6-plus-bhk',
    'The property has six or more bedrooms together with living and kitchen areas.',
    700
  ),

  (
    'suitable-for',
    'Retail Shop',
    'retail-shop',
    'The premises may suit customer-facing retail sale of goods or services.',
    100
  ),
  (
    'suitable-for',
    'Office',
    'office',
    'The premises may suit administrative, professional or general office activities.',
    200
  ),
  (
    'suitable-for',
    'Showroom',
    'showroom',
    'The premises may suit display-led retail or product presentation requiring customer access.',
    300
  ),
  (
    'suitable-for',
    'Restaurant / Cafe',
    'restaurant-cafe',
    'The premises may suit a restaurant, cafe or similar food-service use, subject to required approvals.',
    400
  ),
  (
    'suitable-for',
    'Clinic / Healthcare',
    'clinic-healthcare',
    'The premises may suit a clinic or healthcare service, subject to required approvals and facilities.',
    500
  ),
  (
    'suitable-for',
    'Warehouse / Storage',
    'warehouse-storage',
    'The premises may suit storage, stockholding or warehouse activities.',
    600
  ),
  (
    'suitable-for',
    'Workshop / Light Manufacturing',
    'workshop-light-manufacturing',
    'The premises may suit workshop or light-manufacturing activities, subject to zoning and approvals.',
    700
  ),
  (
    'suitable-for',
    'Bank / Financial Services',
    'bank-financial-services',
    'The premises may suit banking, insurance or other customer-facing financial services.',
    800
  ),
  (
    'suitable-for',
    'Education / Training',
    'education-training',
    'The premises may suit classrooms, coaching or professional training, subject to required approvals.',
    900
  ),
  (
    'suitable-for',
    'Co-working Space',
    'co-working-space',
    'The premises may suit a shared workplace offering desks, rooms or office facilities to multiple users.',
    1000
  );

do $$
declare
  expected_count constant integer := 28;
begin
  if (
    select count(*)
    from approved_property_value_catalogue
  ) <> expected_count then
    raise exception
      'Guard failed: approved property value catalogue does not contain 28 rows.';
  end if;

  if exists (
    select 1
    from (
      values
        ('furnishing-status', 'single_select'),
        ('parking-type', 'single_select'),
        ('bhk-configuration', 'single_select'),
        ('suitable-for', 'multi_select')
    ) as expected(attribute_slug, input_type)
    left join public.property_attributes a
      on a.slug = expected.attribute_slug
    where a.id is null
       or a.is_active is distinct from true
       or a.input_type <> expected.input_type
  ) then
    raise exception
      'Guard failed: the four audited select attributes differ.';
  end if;

  if exists (
    select 1
    from approved_property_value_catalogue c
    join public.property_attributes a
      on a.slug = c.attribute_slug
    join public.property_attribute_values v
      on v.attribute_id = a.id
     and (
       lower(btrim(v.value)) = lower(btrim(c.value_label))
       or lower(btrim(v.slug)) = lower(btrim(c.value_slug))
     )
    where v.value <> c.value_label
       or v.slug <> c.value_slug
  ) then
    raise exception
      'Guard failed: an approved value conflicts with an existing value.';
  end if;

  if exists (
    select 1
    from approved_property_value_catalogue c
    join public.property_attributes a
      on a.slug = c.attribute_slug
    join public.property_attribute_values v
      on v.attribute_id = a.id
     and v.value = c.value_label
     and v.slug = c.value_slug
    where v.description is distinct from c.description
       or v.sort_order is distinct from c.sort_order
       or v.is_active is distinct from true
  ) then
    raise exception
      'Guard failed: an approved value differs from the accepted catalogue state.';
  end if;
end
$$;

insert into public.property_attribute_values (
  attribute_id,
  value,
  slug,
  description,
  sort_order,
  is_active
)
select
  a.id,
  c.value_label,
  c.value_slug,
  c.description,
  c.sort_order,
  true
from approved_property_value_catalogue c
join public.property_attributes a
  on a.slug = c.attribute_slug
where not exists (
  select 1
  from public.property_attribute_values v
  where v.attribute_id = a.id
    and v.value = c.value_label
    and v.slug = c.value_slug
);

commit;
