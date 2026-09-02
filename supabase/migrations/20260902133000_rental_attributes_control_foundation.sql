begin;

-- Rental Attributes production baseline verified on 2026-09-02:
--   rental_attributes:                    0 rows
--   active attributes:                    0 rows
--   rental_attribute_values:              0 rows
--   rental_product_group_attributes:      0 rows
--   listing attribute columns:            0
--   broken references:                    0
--
-- This migration governs Rental Attributes only.
-- Rental Values and Rental Mapping remain unchanged for their later,
-- separately audited subsections.

alter table public.rental_attributes
  add column if not exists description text;

alter table public.rental_attributes
  drop constraint if exists rental_attributes_name_not_blank;

alter table public.rental_attributes
  add constraint rental_attributes_name_not_blank
  check (length(btrim(name)) > 0);

alter table public.rental_attributes
  drop constraint if exists rental_attributes_slug_not_blank;

alter table public.rental_attributes
  add constraint rental_attributes_slug_not_blank
  check (length(btrim(slug)) > 0);

alter table public.rental_attributes
  drop constraint if exists rental_attributes_slug_format_check;

alter table public.rental_attributes
  add constraint rental_attributes_slug_format_check
  check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

alter table public.rental_attributes
  drop constraint if exists rental_attributes_sort_order_check;

alter table public.rental_attributes
  add constraint rental_attributes_sort_order_check
  check (
    sort_order is null
    or sort_order between 0 and 1000000
  );

alter table public.rental_attributes
  drop constraint if exists rental_attributes_unit_not_blank;

alter table public.rental_attributes
  add constraint rental_attributes_unit_not_blank
  check (
    unit is null
    or length(btrim(unit)) > 0
  );

alter table public.rental_attributes
  drop constraint if exists rental_attributes_unit_requires_number;

alter table public.rental_attributes
  add constraint rental_attributes_unit_requires_number
  check (
    unit is null
    or input_type = 'number'
  );

create unique index if not exists
  rental_attributes_normalized_name_uidx
on public.rental_attributes (
  lower(btrim(name))
);

create or replace function public.protect_rental_attribute_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.slug is distinct from old.slug then
    raise exception
      'Rental attribute permanent key cannot be changed.'
      using errcode = '22023';
  end if;

  if new.input_type is distinct from old.input_type then
    raise exception
      'Rental attribute input type is permanent and cannot be changed.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_rental_attribute_identity
  on public.rental_attributes;

create trigger protect_rental_attribute_identity
before update on public.rental_attributes
for each row
execute function public.protect_rental_attribute_identity();

alter table public.rental_attributes enable row level security;

drop policy if exists rentals_write_attributes
  on public.rental_attributes;

drop policy if exists rental_attributes_admin_all
  on public.rental_attributes;

drop policy if exists rental_attributes_authenticated_write
  on public.rental_attributes;

drop policy if exists rental_attributes_insert
  on public.rental_attributes;

drop policy if exists rental_attributes_update
  on public.rental_attributes;

drop policy if exists rental_attributes_delete
  on public.rental_attributes;

revoke insert, update, delete, truncate, references, trigger
on table public.rental_attributes
from anon, authenticated;

grant select
on table public.rental_attributes
to anon, authenticated;

comment on column public.rental_attributes.slug is
  'Permanent machine key. It cannot be changed after creation.';

comment on column public.rental_attributes.input_type is
  'Permanent input contract. It cannot be changed after creation.';

comment on column public.rental_attributes.description is
  'Administrator-reviewed explanation of the rental attribute and its intended listing use.';

commit;
