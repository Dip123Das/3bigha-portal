begin;

-- Services Mapping production baseline verified on 2026-09-07:
--   service_attribute_mappings:              0 rows
--   service_product_group_attributes:        0 rows (legacy, unusable)
--   service_subcategory_product_groups:      0 rows (legacy, unusable)
--   service_attributes:                       0 rows
--   service_attribute_values:                 0 rows
--   provider_service_attribute_values:        0 rows
--   provider_services:                      901 rows
--   service_listings:                       500 rows
--   service_taxons:                         185 rows
--   v_service_catalog:                      151 rows
--   permitted service_taxon_kind values: category, subcategory, service
--
-- The canonical consumer view public.v_service_mapped_attributes reads
-- public.service_attribute_mappings. Product Group taxons are not supported by
-- the production enum, so the two empty Product Group mapping tables are kept
-- intact but frozen against future writes.

do $$
begin
  if to_regclass('public.service_attribute_mappings') is null
     or to_regclass('public.service_product_group_attributes') is null
     or to_regclass('public.service_subcategory_product_groups') is null
     or to_regclass('public.service_attributes') is null
     or to_regclass('public.service_attribute_values') is null
     or to_regclass('public.provider_service_attribute_values') is null
     or to_regclass('public.provider_services') is null
     or to_regclass('public.service_listings') is null
     or to_regclass('public.service_taxons') is null
     or to_regclass('public.v_service_catalog') is null
     or to_regclass('public.v_service_mapped_attributes') is null then
    raise exception 'Services Mapping required production relation is missing';
  end if;

  if (select count(*) from public.service_attribute_mappings) <> 0
     or (select count(*) from public.service_product_group_attributes) <> 0
     or (select count(*) from public.service_subcategory_product_groups) <> 0
     or (select count(*) from public.service_attributes) <> 0
     or (select count(*) from public.service_attribute_values) <> 0
     or (select count(*) from public.provider_service_attribute_values) <> 0
     or (select count(*) from public.provider_services) <> 901
     or (select count(*) from public.service_listings) <> 500
     or (select count(*) from public.service_taxons) <> 185
     or (select count(*) from public.v_service_catalog) <> 151 then
    raise exception 'Services Mapping production baseline changed';
  end if;

  if exists (
    select 1
    from public.service_taxons
    where kind::text not in ('category', 'subcategory', 'service')
  ) then
    raise exception 'Unexpected Services Taxonomy kind exists';
  end if;

  if exists (
    select 1
    from public.service_taxons service
    left join public.service_taxons subcategory
      on subcategory.id = service.parent_id
    where service.kind::text = 'service'
      and (
        subcategory.id is null
        or subcategory.kind::text <> 'subcategory'
      )
  ) then
    raise exception 'Services Mapping hierarchy baseline is invalid';
  end if;
end;
$$;

alter table public.service_attribute_mappings
  add column if not exists is_active boolean;

alter table public.service_attribute_mappings
  add column if not exists source text;

alter table public.service_attribute_mappings
  add column if not exists updated_at timestamp with time zone;

update public.service_attribute_mappings
set
  is_active = coalesce(is_active, true),
  source = coalesce(nullif(btrim(source), ''), 'legacy'),
  sort_order = coalesce(sort_order, 1000),
  updated_at = coalesce(updated_at, created_at, now());

alter table public.service_attribute_mappings
  alter column is_active set default true,
  alter column is_active set not null,
  alter column source set default 'admin',
  alter column source set not null,
  alter column sort_order set default 1000,
  alter column sort_order set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.service_attribute_mappings
  drop constraint if exists service_attribute_mappings_sort_order_check;

alter table public.service_attribute_mappings
  add constraint service_attribute_mappings_sort_order_check
  check (sort_order between 0 and 1000000);

alter table public.service_attribute_mappings
  drop constraint if exists service_attribute_mappings_source_check;

alter table public.service_attribute_mappings
  add constraint service_attribute_mappings_source_check
  check (source ~ '^[a-z][a-z0-9_-]{1,39}$');

create or replace function public.validate_service_attribute_mapping_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_service public.service_taxons%rowtype;
  selected_attribute public.service_attributes%rowtype;
begin
  select *
  into selected_service
  from public.service_taxons
  where id = new.service_taxon_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'The selected individual Service does not exist.';
  end if;

  if selected_service.kind::text <> 'service' then
    raise exception using
      errcode = '22023',
      message = 'A Services Attribute may be mapped only to an individual Service.';
  end if;

  select *
  into selected_attribute
  from public.service_attributes
  where id = new.attribute_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'The selected Services Attribute does not exist.';
  end if;

  if new.is_active and not selected_service.is_active then
    raise exception using
      errcode = '22023',
      message = 'An active mapping requires an active individual Service.';
  end if;

  if new.is_active and not selected_attribute.is_active then
    raise exception using
      errcode = '22023',
      message = 'An active mapping requires an active Services Attribute.';
  end if;

  return new;
end;
$$;

create or replace function public.protect_service_attribute_mapping_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.service_taxon_id is distinct from old.service_taxon_id
     or new.attribute_id is distinct from old.attribute_id
     or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '22023',
      message = 'The mapping identity, individual Service and parent Attribute are permanent.';
  end if;

  return new;
end;
$$;

create or replace function public.touch_service_attribute_mapping_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_service_attribute_mapping_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception using
    errcode = '22023',
    message = 'Services Attribute mappings are permanent. Deactivate the mapping instead.';
end;
$$;

drop trigger if exists validate_service_attribute_mapping_context
  on public.service_attribute_mappings;
create trigger validate_service_attribute_mapping_context
before insert or update on public.service_attribute_mappings
for each row execute function public.validate_service_attribute_mapping_context();

drop trigger if exists protect_service_attribute_mapping_identity
  on public.service_attribute_mappings;
create trigger protect_service_attribute_mapping_identity
before update on public.service_attribute_mappings
for each row execute function public.protect_service_attribute_mapping_identity();

drop trigger if exists touch_service_attribute_mapping_updated_at
  on public.service_attribute_mappings;
create trigger touch_service_attribute_mapping_updated_at
before update on public.service_attribute_mappings
for each row execute function public.touch_service_attribute_mapping_updated_at();

drop trigger if exists prevent_service_attribute_mapping_delete
  on public.service_attribute_mappings;
create trigger prevent_service_attribute_mapping_delete
before delete on public.service_attribute_mappings
for each row execute function public.prevent_service_attribute_mapping_delete();

drop trigger if exists prevent_service_attribute_mapping_truncate
  on public.service_attribute_mappings;
create trigger prevent_service_attribute_mapping_truncate
before truncate on public.service_attribute_mappings
for each statement execute function public.prevent_service_attribute_mapping_delete();

create or replace function public.freeze_legacy_service_product_group_mapping()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception using
    errcode = '22023',
    message = 'Legacy Services Product Group mapping tables are frozen. Use direct individual Service to Attribute mappings.';
end;
$$;

drop trigger if exists freeze_legacy_service_product_group_attributes
  on public.service_product_group_attributes;
create trigger freeze_legacy_service_product_group_attributes
before insert or update or delete on public.service_product_group_attributes
for each row execute function public.freeze_legacy_service_product_group_mapping();

drop trigger if exists freeze_legacy_service_product_group_attributes_truncate
  on public.service_product_group_attributes;
create trigger freeze_legacy_service_product_group_attributes_truncate
before truncate on public.service_product_group_attributes
for each statement execute function public.freeze_legacy_service_product_group_mapping();

drop trigger if exists freeze_legacy_service_subcategory_product_groups
  on public.service_subcategory_product_groups;
create trigger freeze_legacy_service_subcategory_product_groups
before insert or update or delete on public.service_subcategory_product_groups
for each row execute function public.freeze_legacy_service_product_group_mapping();

drop trigger if exists freeze_legacy_service_subcategory_product_groups_truncate
  on public.service_subcategory_product_groups;
create trigger freeze_legacy_service_subcategory_product_groups_truncate
before truncate on public.service_subcategory_product_groups
for each statement execute function public.freeze_legacy_service_product_group_mapping();

alter table public.service_attribute_mappings enable row level security;
alter table public.service_product_group_attributes enable row level security;
alter table public.service_subcategory_product_groups enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'service_attribute_mappings',
        'service_product_group_attributes',
        'service_subcategory_product_groups'
      )
      and cmd <> 'SELECT'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end;
$$;

drop policy if exists service_attribute_mappings_public_read
  on public.service_attribute_mappings;
create policy service_attribute_mappings_public_read
on public.service_attribute_mappings
for select
to anon, authenticated
using (is_active = true);

drop policy if exists service_product_group_attributes_public_read
  on public.service_product_group_attributes;
create policy service_product_group_attributes_public_read
on public.service_product_group_attributes
for select
to anon, authenticated
using (true);

drop policy if exists service_subcategory_product_groups_public_read
  on public.service_subcategory_product_groups;
create policy service_subcategory_product_groups_public_read
on public.service_subcategory_product_groups
for select
to anon, authenticated
using (true);

revoke insert, update, delete, truncate, references, trigger
on table public.service_attribute_mappings
from anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
on table public.service_product_group_attributes
from anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
on table public.service_subcategory_product_groups
from anon, authenticated;

grant select on table public.service_attribute_mappings
to anon, authenticated;

grant select on table public.service_product_group_attributes
to anon, authenticated;

grant select on table public.service_subcategory_product_groups
to anon, authenticated;

create or replace view public.v_service_mapped_attributes as
select
  mapping.service_taxon_id,
  attribute.id as attribute_id,
  attribute.name as attribute_name,
  attribute.slug as attribute_slug,
  attribute.input_type,
  attribute.unit,
  mapping.is_required,
  coalesce(mapping.sort_order, attribute.sort_order, 999999) as sort_order
from public.service_attribute_mappings mapping
join public.service_attributes attribute
  on attribute.id = mapping.attribute_id
where mapping.is_active = true
  and attribute.is_active = true;

grant select on table public.v_service_mapped_attributes
to anon, authenticated;

do $$
begin
  if (select count(*) from public.service_attribute_mappings) <> 0
     or (select count(*) from public.service_product_group_attributes) <> 0
     or (select count(*) from public.service_subcategory_product_groups) <> 0
     or (select count(*) from public.service_attributes) <> 0
     or (select count(*) from public.service_attribute_values) <> 0
     or (select count(*) from public.provider_service_attribute_values) <> 0
     or (select count(*) from public.provider_services) <> 901
     or (select count(*) from public.service_listings) <> 500
     or (select count(*) from public.service_taxons) <> 185
     or (select count(*) from public.v_service_catalog) <> 151 then
    raise exception 'Services Mapping preservation verification failed';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'service_attribute_mappings',
        'service_product_group_attributes',
        'service_subcategory_product_groups'
      )
      and cmd <> 'SELECT'
  ) then
    raise exception 'Services Mapping browser write policy remains';
  end if;

  if has_table_privilege(
       'anon',
       'public.service_attribute_mappings',
       'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
     )
     or has_table_privilege(
       'authenticated',
       'public.service_attribute_mappings',
       'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
     ) then
    raise exception 'Services Mapping browser write privilege remains';
  end if;
end;
$$;

commit;
