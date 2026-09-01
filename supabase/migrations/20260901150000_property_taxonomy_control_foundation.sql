begin;

alter table public.property_types
  add column if not exists description text,
  add column if not exists is_active boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.property_types
set
  is_active = coalesce(is_active, true),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  is_active is null
  or created_at is null
  or updated_at is null;

alter table public.property_types
  alter column is_active set default true,
  alter column is_active set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.property_subtypes
  add column if not exists description text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.property_subtypes
set
  is_active = coalesce(is_active, true),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  is_active is null
  or created_at is null
  or updated_at is null;

alter table public.property_subtypes
  alter column is_active set default true,
  alter column is_active set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.property_types
  drop constraint if exists property_types_name_not_blank;

alter table public.property_types
  add constraint property_types_name_not_blank
  check (length(btrim(name)) > 0);

alter table public.property_types
  drop constraint if exists property_types_slug_not_blank;

alter table public.property_types
  add constraint property_types_slug_not_blank
  check (length(btrim(slug)) > 0);

alter table public.property_subtypes
  drop constraint if exists property_subtypes_name_not_blank;

alter table public.property_subtypes
  add constraint property_subtypes_name_not_blank
  check (length(btrim(name)) > 0);

alter table public.property_subtypes
  drop constraint if exists property_subtypes_slug_not_blank;

alter table public.property_subtypes
  add constraint property_subtypes_slug_not_blank
  check (length(btrim(slug)) > 0);

create unique index if not exists property_types_normalized_name_uidx
  on public.property_types (lower(btrim(name)));

create unique index if not exists property_types_normalized_slug_uidx
  on public.property_types (lower(btrim(slug)));

create unique index if not exists property_subtypes_type_normalized_name_uidx
  on public.property_subtypes (type_id, lower(btrim(name)));

create unique index if not exists property_subtypes_type_normalized_slug_uidx
  on public.property_subtypes (type_id, lower(btrim(slug)));

create or replace function public.touch_property_taxonomy_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_property_types_updated_at
  on public.property_types;

create trigger touch_property_types_updated_at
before update on public.property_types
for each row
execute function public.touch_property_taxonomy_updated_at();

drop trigger if exists touch_property_subtypes_updated_at
  on public.property_subtypes;

create trigger touch_property_subtypes_updated_at
before update on public.property_subtypes
for each row
execute function public.touch_property_taxonomy_updated_at();

comment on column public.property_types.slug is
  'Permanent machine key. It must not be changed after creation.';

comment on column public.property_subtypes.slug is
  'Permanent machine key within its property type. It must not be changed after creation.';

comment on column public.property_types.description is
  'Administrator-reviewed explanation of the property type and its intended use.';

comment on column public.property_subtypes.description is
  'Administrator-reviewed explanation of the property subtype and its intended use.';

commit;
