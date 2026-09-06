begin;

-- Materials Mapping production baseline verified on 2026-09-05:
--   material_product_group_attributes:    5 rows
--   material_subcategory_product_groups: 12 rows (all active)
--
-- This migration preserves every existing relationship and UUID. It adds
-- lifecycle-only administration, permanent mapping identity, endpoint
-- validation and server-only writes. It creates no catalogue mappings.

do $$
declare
  attribute_mapping_count bigint;
  subcategory_mapping_count bigint;
  active_subcategory_mapping_count bigint;
begin
  if to_regclass('public.material_product_group_attributes') is null
     or to_regclass('public.material_subcategory_product_groups') is null
     or to_regclass('public.material_taxons') is null
     or to_regclass('public.material_attributes') is null then
    raise exception 'Materials Mapping foundation tables are missing';
  end if;

  select count(*) into attribute_mapping_count
  from public.material_product_group_attributes;

  select count(*), count(*) filter (where is_active)
    into subcategory_mapping_count, active_subcategory_mapping_count
  from public.material_subcategory_product_groups;

  if attribute_mapping_count <> 5
     or subcategory_mapping_count <> 12
     or active_subcategory_mapping_count <> 12 then
    raise exception
      'Materials Mapping baseline changed: attribute mappings %, subcategory mappings %, active subcategory mappings %',
      attribute_mapping_count,
      subcategory_mapping_count,
      active_subcategory_mapping_count;
  end if;
end;
$$;

alter table public.material_product_group_attributes
  add column if not exists is_active boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.material_product_group_attributes
set
  is_active = coalesce(is_active, true),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now())
where is_active is null
   or created_at is null
   or updated_at is null;

alter table public.material_product_group_attributes
  alter column is_active set default true,
  alter column is_active set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.material_product_group_attributes
  drop constraint if exists material_product_group_attributes_sort_order_check;

alter table public.material_product_group_attributes
  add constraint material_product_group_attributes_sort_order_check
  check (sort_order between 0 and 1000000);

create or replace function public.validate_material_product_group_attribute_context()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  product_group_kind text;
  attribute_exists boolean;
begin
  select kind::text into product_group_kind
  from public.material_taxons
  where id = new.product_group_id;

  if product_group_kind is null then
    raise exception 'Invalid Materials Product Group: %', new.product_group_id
      using errcode = '23503';
  end if;

  if product_group_kind <> 'product_group' then
    raise exception 'Materials Attributes may only map to a Product Group'
      using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.material_attributes
    where id = new.attribute_id
  ) into attribute_exists;

  if not attribute_exists then
    raise exception 'Invalid Materials Attribute: %', new.attribute_id
      using errcode = '23503';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_material_product_group_attribute_context
  on public.material_product_group_attributes;

create trigger validate_material_product_group_attribute_context
before insert or update
on public.material_product_group_attributes
for each row
execute function public.validate_material_product_group_attribute_context();

create or replace function public.protect_material_product_group_attribute_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.product_group_id is distinct from old.product_group_id
     or new.attribute_id is distinct from old.attribute_id then
    raise exception
      'The permanent Product Group and Materials Attribute mapping identity cannot be changed'
      using errcode = '22023';
  end if;

  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists protect_material_product_group_attribute_identity
  on public.material_product_group_attributes;

create trigger protect_material_product_group_attribute_identity
before update
on public.material_product_group_attributes
for each row
execute function public.protect_material_product_group_attribute_identity();

create or replace function public.touch_material_product_group_attribute_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_material_product_group_attribute_updated_at
  on public.material_product_group_attributes;

create trigger touch_material_product_group_attribute_updated_at
before update
on public.material_product_group_attributes
for each row
execute function public.touch_material_product_group_attribute_updated_at();

create or replace function public.prevent_material_product_group_attribute_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'Materials Attribute mappings cannot be deleted. Deactivate the mapping instead.'
    using errcode = '55000';
end;
$$;

drop trigger if exists prevent_material_product_group_attribute_delete
  on public.material_product_group_attributes;

create trigger prevent_material_product_group_attribute_delete
before delete
on public.material_product_group_attributes
for each row
execute function public.prevent_material_product_group_attribute_delete();

create or replace function public.prevent_material_subcategory_product_group_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'Materials Subcategory to Product Group mappings cannot be deleted. Deactivate the relationship instead.'
    using errcode = '55000';
end;
$$;

drop trigger if exists prevent_material_subcategory_product_group_delete
  on public.material_subcategory_product_groups;

create trigger prevent_material_subcategory_product_group_delete
before delete
on public.material_subcategory_product_groups
for each row
execute function public.prevent_material_subcategory_product_group_delete();

create index if not exists material_product_group_attributes_lifecycle_sort_idx
  on public.material_product_group_attributes
  (product_group_id, is_active, sort_order, attribute_id);

alter table public.material_product_group_attributes enable row level security;

drop policy if exists material_product_group_attributes_public_read
  on public.material_product_group_attributes;
drop policy if exists material_product_group_attributes_public_read_active
  on public.material_product_group_attributes;

create policy material_product_group_attributes_public_read_active
on public.material_product_group_attributes
for select
to anon, authenticated
using (is_active);

drop policy if exists material_subcategory_product_groups_public_read
  on public.material_subcategory_product_groups;
drop policy if exists material_subcategory_product_groups_public_read_active
  on public.material_subcategory_product_groups;

create policy material_subcategory_product_groups_public_read_active
on public.material_subcategory_product_groups
for select
to anon, authenticated
using (is_active);

revoke insert, update, delete, truncate
on table public.material_product_group_attributes
from anon, authenticated;

revoke insert, update, delete, truncate
on table public.material_subcategory_product_groups
from anon, authenticated;

grant select
on table public.material_product_group_attributes
to anon, authenticated;

grant select
on table public.material_subcategory_product_groups
to anon, authenticated;

comment on column public.material_product_group_attributes.is_active is
  'Lifecycle status. Inactive mappings remain preserved for history.';
comment on column public.material_product_group_attributes.is_required is
  'Whether a listing in this Product Group must answer the mapped Materials Attribute.';
comment on column public.material_product_group_attributes.sort_order is
  'Stable display order of the mapped Materials Attribute within its Product Group.';

do $$
declare
  attribute_mapping_count bigint;
  active_attribute_mapping_count bigint;
  subcategory_mapping_count bigint;
  active_subcategory_mapping_count bigint;
begin
  select count(*), count(*) filter (where is_active)
    into attribute_mapping_count, active_attribute_mapping_count
  from public.material_product_group_attributes;

  select count(*), count(*) filter (where is_active)
    into subcategory_mapping_count, active_subcategory_mapping_count
  from public.material_subcategory_product_groups;

  if attribute_mapping_count <> 5
     or active_attribute_mapping_count <> 5
     or subcategory_mapping_count <> 12
     or active_subcategory_mapping_count <> 12
     or exists (
       select 1
       from public.material_product_group_attributes mapping
       left join public.material_taxons product_group
         on product_group.id = mapping.product_group_id
       left join public.material_attributes attribute_row
         on attribute_row.id = mapping.attribute_id
       where product_group.id is null
          or product_group.kind <> 'product_group'
          or attribute_row.id is null
     ) then
    raise exception 'Materials Mapping preservation verification failed';
  end if;
end;
$$;

commit;
