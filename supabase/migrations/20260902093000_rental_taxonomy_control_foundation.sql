begin;

-- Rental Taxonomy production baseline verified on 2026-09-02:
--   rental_taxons:       165 rows
--   active taxons:       165 rows
--   types:                11 rows
--   categories:           19 rows
--   subcategories:        52 rows
--   product groups:       83 rows
--   rental listings:     240 published rows
--
-- The legacy rental_categories, rental_subcategories and rental_equipment
-- tables are intentionally preserved because all current rental listings use
-- those catalogue identities.

alter table public.rental_taxons
  add column if not exists description text,
  add column if not exists is_active boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.rental_taxons
set
  is_active = coalesce(is_active, true),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  is_active is null
  or created_at is null
  or updated_at is null;

alter table public.rental_taxons
  alter column is_active set default true,
  alter column is_active set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.rental_taxons
  drop constraint if exists rental_taxons_name_not_blank;

alter table public.rental_taxons
  add constraint rental_taxons_name_not_blank
  check (length(btrim(name)) > 0);

alter table public.rental_taxons
  drop constraint if exists rental_taxons_slug_not_blank;

alter table public.rental_taxons
  add constraint rental_taxons_slug_not_blank
  check (length(btrim(slug)) > 0);

alter table public.rental_taxons
  drop constraint if exists rental_taxons_slug_format_check;

alter table public.rental_taxons
  add constraint rental_taxons_slug_format_check
  check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

alter table public.rental_taxons
  drop constraint if exists rental_taxons_sort_order_check;

alter table public.rental_taxons
  add constraint rental_taxons_sort_order_check
  check (
    sort_order is null
    or sort_order between 0 and 1000000
  );

-- Preserve the incorrect historical record but remove it from active use.
-- A correct active Earthmoving category already exists under:
-- Land Development & Earthmoving Equipment.
update public.rental_taxons
set
  is_active = false,
  description = coalesce(
    description,
    'Inactive historical duplicate. The correct Earthmoving category is retained under Land Development & Earthmoving Equipment.'
  ),
  updated_at = now()
where id = 'cd926add-7aed-4be2-99f2-1d61cc6bbae3'::uuid
  and kind = 'category'
  and slug = 'arthmoving'
  and parent_id is null
  and not exists (
    select 1
    from public.rental_taxons child
    where child.parent_id =
      'cd926add-7aed-4be2-99f2-1d61cc6bbae3'::uuid
  );

create unique index if not exists
  rental_taxons_root_kind_normalized_slug_uidx
on public.rental_taxons (
  kind,
  lower(btrim(slug))
)
where parent_id is null
  and is_active is true;

create unique index if not exists
  rental_taxons_parent_kind_normalized_slug_uidx
on public.rental_taxons (
  parent_id,
  kind,
  lower(btrim(slug))
)
where parent_id is not null
  and is_active is true;

create or replace function public.touch_rental_taxonomy_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_rental_taxons_updated_at
  on public.rental_taxons;

create trigger touch_rental_taxons_updated_at
before update on public.rental_taxons
for each row
execute function public.touch_rental_taxonomy_updated_at();

create or replace function public.protect_rental_taxonomy_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind is distinct from old.kind then
    raise exception
      'Rental taxonomy kind is permanent and cannot be changed.'
      using errcode = '22023';
  end if;

  if new.parent_id is distinct from old.parent_id then
    raise exception
      'Rental taxonomy parent relationship is permanent and cannot be changed.'
      using errcode = '22023';
  end if;

  if new.slug is distinct from old.slug then
    raise exception
      'Rental taxonomy permanent key cannot be changed.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_rental_taxonomy_identity
  on public.rental_taxons;

create trigger protect_rental_taxonomy_identity
before update on public.rental_taxons
for each row
execute function public.protect_rental_taxonomy_identity();

alter table public.rental_taxons enable row level security;

drop policy if exists rentals_write_taxons
  on public.rental_taxons;

drop policy if exists rental_taxons_admin_all
  on public.rental_taxons;

drop policy if exists rental_taxons_authenticated_write
  on public.rental_taxons;

drop policy if exists rental_taxons_insert
  on public.rental_taxons;

drop policy if exists rental_taxons_update
  on public.rental_taxons;

drop policy if exists rental_taxons_delete
  on public.rental_taxons;

revoke insert, update, delete
on table public.rental_taxons
from anon, authenticated;

grant select
on table public.rental_taxons
to anon, authenticated;

comment on column public.rental_taxons.slug is
  'Permanent machine key. It must not be changed after creation.';

comment on column public.rental_taxons.parent_id is
  'Permanent parent relationship. It must not be changed after creation.';

comment on column public.rental_taxons.kind is
  'Permanent hierarchy level. It must not be changed after creation.';

comment on column public.rental_taxons.description is
  'Administrator-reviewed explanation of the rental taxonomy entry and its intended use.';

commit;
