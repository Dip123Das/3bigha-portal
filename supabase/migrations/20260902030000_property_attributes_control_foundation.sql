begin;

alter table public.property_attributes
  add column if not exists description text;

update public.property_attributes
set
  sort_order = coalesce(sort_order, 1000),
  is_active = coalesce(is_active, true),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  sort_order is null
  or is_active is null
  or created_at is null
  or updated_at is null;

alter table public.property_attributes
  alter column sort_order set default 1000,
  alter column sort_order set not null,
  alter column is_active set default true,
  alter column is_active set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.property_attributes
  drop constraint if exists property_attributes_name_not_blank;

alter table public.property_attributes
  add constraint property_attributes_name_not_blank
  check (length(btrim(name)) > 0);

alter table public.property_attributes
  drop constraint if exists property_attributes_slug_not_blank;

alter table public.property_attributes
  add constraint property_attributes_slug_not_blank
  check (length(btrim(slug)) > 0);

alter table public.property_attributes
  drop constraint if exists property_attributes_description_length_check;

alter table public.property_attributes
  add constraint property_attributes_description_length_check
  check (description is null or length(description) <= 600);

create unique index if not exists property_attributes_normalized_name_uidx
  on public.property_attributes (lower(btrim(name)));

create unique index if not exists property_attributes_normalized_slug_uidx
  on public.property_attributes (lower(btrim(slug)));

create or replace function public.touch_property_attributes_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_property_attributes_updated_at
  on public.property_attributes;

create trigger touch_property_attributes_updated_at
before update on public.property_attributes
for each row
execute function public.touch_property_attributes_updated_at();

comment on column public.property_attributes.slug is
  'Permanent machine key. It must not be changed after creation.';

comment on column public.property_attributes.input_type is
  'Answer storage contract. Do not change after values, mappings or listing answers exist.';

comment on column public.property_attributes.description is
  'Administrator-reviewed explanation of the attribute and its intended classification use.';

do $$
declare
  record_to_check record;
begin
  for record_to_check in
    select *
    from (
      values
        ('built-up-area', 'Built-up Area', 'number', 'sq ft'),
        ('carpet-area', 'Carpet Area', 'number', 'sq ft'),
        ('furnishing-status', 'Furnishing Status', 'single_select', null),
        ('parking-type', 'Parking Type', 'single_select', null),
        ('parking-spaces', 'Parking Spaces', 'number', null),
        ('age-of-property', 'Age of Property', 'number', 'years'),
        ('bhk-configuration', 'BHK Configuration', 'single_select', null),
        ('bedrooms', 'Bedrooms', 'number', null),
        ('bathrooms', 'Bathrooms', 'number', null),
        ('kitchens', 'Kitchens', 'number', null),
        ('balconies', 'Balconies', 'number', null),
        ('floor-number', 'Floor Number', 'number', null),
        ('total-floors', 'Total Floors', 'number', null),
        ('monthly-maintenance', 'Monthly Maintenance', 'number', 'INR'),
        ('frontage-width', 'Frontage Width', 'number', 'ft'),
        ('washroom-available', 'Washroom Available', 'boolean', null),
        ('pantry-available', 'Pantry Available', 'boolean', null),
        ('suitable-for', 'Suitable For', 'multi_select', null),
        ('cabins-rooms', 'Cabins / Rooms', 'number', null),
        ('workstations', 'Workstations', 'number', null),
        ('meeting-room-available', 'Meeting Room Available', 'boolean', null)
    ) as approved(slug, name, input_type, unit)
  loop
    if exists (
      select 1
      from public.property_attributes pa
      where lower(btrim(pa.slug)) = lower(record_to_check.slug)
        and (
          pa.name is distinct from record_to_check.name
          or pa.input_type is distinct from record_to_check.input_type
          or pa.unit is distinct from record_to_check.unit
        )
    ) then
      raise exception
        'Guard failed: approved attribute % differs from the existing definition.',
        record_to_check.slug;
    end if;
  end loop;
end
$$;

insert into public.property_attributes (
  name,
  slug,
  description,
  input_type,
  unit,
  sort_order,
  is_active
)
values
  (
    'Built-up Area',
    'built-up-area',
    'Total covered area of the property, including usable internal space and applicable wall or covered areas.',
    'number',
    'sq ft',
    100,
    true
  ),
  (
    'Carpet Area',
    'carpet-area',
    'Net usable floor area inside the property, excluding external walls and common areas.',
    'number',
    'sq ft',
    110,
    true
  ),
  (
    'Furnishing Status',
    'furnishing-status',
    'Indicates whether the property is unfurnished, partly furnished or fully furnished.',
    'single_select',
    null,
    120,
    true
  ),
  (
    'Parking Type',
    'parking-type',
    'Identifies the form of parking provided with the property, such as open or covered parking.',
    'single_select',
    null,
    130,
    true
  ),
  (
    'Parking Spaces',
    'parking-spaces',
    'Number of parking spaces available with the property.',
    'number',
    null,
    140,
    true
  ),
  (
    'Age of Property',
    'age-of-property',
    'Approximate completed age of the building or constructed property.',
    'number',
    'years',
    150,
    true
  ),
  (
    'BHK Configuration',
    'bhk-configuration',
    'Standard bedroom-hall-kitchen configuration used for residential units.',
    'single_select',
    null,
    200,
    true
  ),
  (
    'Bedrooms',
    'bedrooms',
    'Number of rooms primarily intended for sleeping.',
    'number',
    null,
    210,
    true
  ),
  (
    'Bathrooms',
    'bathrooms',
    'Number of bathrooms or toilets available within the property.',
    'number',
    null,
    220,
    true
  ),
  (
    'Kitchens',
    'kitchens',
    'Number of dedicated kitchen spaces within the property.',
    'number',
    null,
    230,
    true
  ),
  (
    'Balconies',
    'balconies',
    'Number of balconies attached to or included in the property.',
    'number',
    null,
    240,
    true
  ),
  (
    'Floor Number',
    'floor-number',
    'Floor on which the listed unit or premises is situated.',
    'number',
    null,
    250,
    true
  ),
  (
    'Total Floors',
    'total-floors',
    'Total number of floors in the building containing the property.',
    'number',
    null,
    260,
    true
  ),
  (
    'Monthly Maintenance',
    'monthly-maintenance',
    'Regular monthly maintenance charge associated with the property, when applicable.',
    'number',
    'INR',
    270,
    true
  ),
  (
    'Frontage Width',
    'frontage-width',
    'Width of the property frontage facing its principal access or road.',
    'number',
    'ft',
    300,
    true
  ),
  (
    'Washroom Available',
    'washroom-available',
    'Records whether a washroom is available within or specifically assigned to the premises.',
    'boolean',
    null,
    310,
    true
  ),
  (
    'Pantry Available',
    'pantry-available',
    'Records whether the premises includes a pantry or refreshment-preparation area.',
    'boolean',
    null,
    320,
    true
  ),
  (
    'Suitable For',
    'suitable-for',
    'Identifies the practical business or occupancy uses for which the premises is suitable.',
    'multi_select',
    null,
    330,
    true
  ),
  (
    'Cabins / Rooms',
    'cabins-rooms',
    'Number of enclosed cabins or functional rooms in a commercial or office property.',
    'number',
    null,
    340,
    true
  ),
  (
    'Workstations',
    'workstations',
    'Number of workstations the office or commercial premises is arranged to support.',
    'number',
    null,
    350,
    true
  ),
  (
    'Meeting Room Available',
    'meeting-room-available',
    'Records whether the premises includes a dedicated meeting or conference room.',
    'boolean',
    null,
    360,
    true
  )
on conflict (slug) do nothing;

alter table public.property_listing_attributes enable row level security;

grant select, insert, update, delete
  on public.property_listing_attributes
  to authenticated;

drop policy if exists property_listing_attributes_owner_select_own
  on public.property_listing_attributes;

create policy property_listing_attributes_owner_select_own
on public.property_listing_attributes
for select
to authenticated
using (
  exists (
    select 1
    from public.property_listings pl
    where pl.id = property_listing_attributes.listing_id
      and (
        pl.owner_id = auth.uid()
        or pl.owner_user_id = auth.uid()
      )
  )
);

drop policy if exists property_listing_attributes_owner_insert_own
  on public.property_listing_attributes;

create policy property_listing_attributes_owner_insert_own
on public.property_listing_attributes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.property_listings pl
    where pl.id = property_listing_attributes.listing_id
      and (
        pl.owner_id = auth.uid()
        or pl.owner_user_id = auth.uid()
      )
      and coalesce(pl.status, '') <> 'published'
  )
);

drop policy if exists property_listing_attributes_owner_update_own_unpublished
  on public.property_listing_attributes;

create policy property_listing_attributes_owner_update_own_unpublished
on public.property_listing_attributes
for update
to authenticated
using (
  exists (
    select 1
    from public.property_listings pl
    where pl.id = property_listing_attributes.listing_id
      and (
        pl.owner_id = auth.uid()
        or pl.owner_user_id = auth.uid()
      )
      and coalesce(pl.status, '') <> 'published'
  )
)
with check (
  exists (
    select 1
    from public.property_listings pl
    where pl.id = property_listing_attributes.listing_id
      and (
        pl.owner_id = auth.uid()
        or pl.owner_user_id = auth.uid()
      )
      and coalesce(pl.status, '') <> 'published'
  )
);

drop policy if exists property_listing_attributes_owner_delete_own_unpublished
  on public.property_listing_attributes;

create policy property_listing_attributes_owner_delete_own_unpublished
on public.property_listing_attributes
for delete
to authenticated
using (
  exists (
    select 1
    from public.property_listings pl
    where pl.id = property_listing_attributes.listing_id
      and (
        pl.owner_id = auth.uid()
        or pl.owner_user_id = auth.uid()
      )
      and coalesce(pl.status, '') <> 'published'
  )
);

commit;
