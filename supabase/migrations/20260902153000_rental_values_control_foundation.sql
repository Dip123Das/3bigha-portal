begin;

-- Rental Values production baseline verified on 2026-09-02:
--   rental_attribute_values:            0 rows
--   active values:                      0 rows
--   inactive values:                    0 rows
--   rental_attributes:                  0 rows
--   select attributes:                  0 rows
--   duplicate groups:                   0
--   invalid rows:                       0
--   foreign-key consumers:              0
--
-- This migration governs Rental Values only.
-- Values remain reusable global options under their parent attributes.
-- Product-group applicability belongs to the separately audited
-- Rental Mapping subsection.

alter table public.rental_attribute_values
  add column if not exists slug text,
  add column if not exists description text;

update public.rental_attribute_values
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
    from public.rental_attribute_values
    where slug is null
       or btrim(slug) = ''
  ) then
    raise exception
      'Guard failed: an existing rental value has no permanent key.';
  end if;
end
$$;

alter table public.rental_attribute_values
  alter column slug set not null,
  alter column sort_order set default 1000,
  alter column sort_order set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.rental_attribute_values
  drop constraint if exists rental_attribute_values_value_not_blank;

alter table public.rental_attribute_values
  add constraint rental_attribute_values_value_not_blank
  check (length(btrim(value)) > 0);

alter table public.rental_attribute_values
  drop constraint if exists rental_attribute_values_slug_not_blank;

alter table public.rental_attribute_values
  add constraint rental_attribute_values_slug_not_blank
  check (length(btrim(slug)) > 0);

alter table public.rental_attribute_values
  drop constraint if exists rental_attribute_values_slug_format_check;

alter table public.rental_attribute_values
  add constraint rental_attribute_values_slug_format_check
  check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

alter table public.rental_attribute_values
  drop constraint if exists rental_attribute_values_description_length;

alter table public.rental_attribute_values
  add constraint rental_attribute_values_description_length
  check (
    description is null
    or length(description) <= 600
  );

alter table public.rental_attribute_values
  drop constraint if exists rental_attribute_values_sort_order_check;

alter table public.rental_attribute_values
  add constraint rental_attribute_values_sort_order_check
  check (sort_order between 0 and 1000000);

create unique index if not exists
  rental_attribute_values_attribute_normalized_value_uidx
on public.rental_attribute_values (
  attribute_id,
  lower(btrim(value))
);

create unique index if not exists
  rental_attribute_values_attribute_normalized_slug_uidx
on public.rental_attribute_values (
  attribute_id,
  lower(btrim(slug))
);

-- Prevent removal of a parent attribute while historical values exist.
-- The Rental Attributes API already uses activate/deactivate lifecycle.
alter table public.rental_attribute_values
  drop constraint if exists rental_attribute_values_attribute_id_fkey;

alter table public.rental_attribute_values
  add constraint rental_attribute_values_attribute_id_fkey
  foreign key (attribute_id)
  references public.rental_attributes(id)
  on delete restrict;

create or replace function public.touch_rental_attribute_value_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_rental_attribute_values_updated_at
  on public.rental_attribute_values;

create trigger touch_rental_attribute_values_updated_at
before update on public.rental_attribute_values
for each row
execute function public.touch_rental_attribute_value_updated_at();

create or replace function public.protect_rental_attribute_value_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.attribute_id is distinct from old.attribute_id then
    raise exception
      'Rental value parent attribute is permanent and cannot be changed.'
      using errcode = '22023';
  end if;

  if new.slug is distinct from old.slug then
    raise exception
      'Rental value permanent key cannot be changed.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_rental_attribute_value_identity
  on public.rental_attribute_values;

create trigger protect_rental_attribute_value_identity
before update on public.rental_attribute_values
for each row
execute function public.protect_rental_attribute_value_identity();

alter table public.rental_attribute_values enable row level security;

drop policy if exists rentals_write_attribute_values
  on public.rental_attribute_values;

drop policy if exists rental_attribute_values_admin_all
  on public.rental_attribute_values;

drop policy if exists rental_attribute_values_authenticated_write
  on public.rental_attribute_values;

drop policy if exists rental_attribute_values_insert
  on public.rental_attribute_values;

drop policy if exists rental_attribute_values_update
  on public.rental_attribute_values;

drop policy if exists rental_attribute_values_delete
  on public.rental_attribute_values;

revoke insert, update, delete, truncate, references, trigger
on table public.rental_attribute_values
from anon, authenticated;

grant select
on table public.rental_attribute_values
to anon, authenticated;

comment on column public.rental_attribute_values.slug is
  'Permanent machine key within its rental attribute. It cannot be changed after creation.';

comment on column public.rental_attribute_values.attribute_id is
  'Permanent parent attribute relationship. It cannot be changed after creation.';

comment on column public.rental_attribute_values.description is
  'Administrator-reviewed explanation of the controlled rental option.';

commit;
