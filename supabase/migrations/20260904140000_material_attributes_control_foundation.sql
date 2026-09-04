begin;

-- Materials Attributes production baseline verified on 2026-09-04:
--   material_attributes:                    16 rows (all active)
--   material_attribute_values:               0 rows
--   material_product_group_attributes:       5 rows
--   property_listing_attribute_values:       0 rows
--
-- This migration preserves every existing Attribute UUID and mapping. It
-- establishes lifecycle-only administration and permanent specification
-- identity without creating, deleting or remapping catalogue records.

do $$
declare
  attribute_count bigint;
  value_count bigint;
  mapping_count bigint;
  legacy_answer_count bigint;
begin
  if to_regclass('public.material_attributes') is null
     or to_regclass('public.material_attribute_values') is null
     or to_regclass('public.material_product_group_attributes') is null
     or to_regclass('public.property_listing_attribute_values') is null then
    raise exception 'Materials Attributes baseline tables are missing';
  end if;

  select count(*) into attribute_count
  from public.material_attributes;

  select count(*) into value_count
  from public.material_attribute_values;

  select count(*) into mapping_count
  from public.material_product_group_attributes;

  select count(*) into legacy_answer_count
  from public.property_listing_attribute_values;

  if attribute_count <> 16
     or value_count <> 0
     or mapping_count <> 5
     or legacy_answer_count <> 0 then
    raise exception
      'Materials Attributes baseline changed (attributes %, values %, mappings %, legacy answers %)',
      attribute_count,
      value_count,
      mapping_count,
      legacy_answer_count;
  end if;
end;
$$;

alter table public.material_attributes
  add column if not exists description text,
  add column if not exists source text;

update public.material_attributes
set source = 'legacy'
where source is null or btrim(source) = '';

alter table public.material_attributes
  alter column source set default 'admin',
  alter column source set not null;

-- Preserve the Aggregate Size Attribute and its mapping while removing a unit
-- from a controlled-choice field. The choices themselves will carry values
-- such as 10 mm or 20 mm in the separate Materials Values catalogue.
do $$
declare
  normalized_count bigint;
begin
  update public.material_attributes
  set unit = null,
      updated_at = now()
  where id = 'b04818b5-6219-4226-9c9a-8d7ef576a968'::uuid
    and name = 'Aggregate Size'
    and slug = 'aggregate_size'
    and input_type = 'single_select'
    and unit = 'mm';

  get diagnostics normalized_count = row_count;

  if normalized_count <> 1 then
    raise exception 'Aggregate Size normalization baseline changed';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.material_attributes'::regclass
      and conname = 'material_attributes_name_format_check'
  ) then
    alter table public.material_attributes
      add constraint material_attributes_name_format_check
      check (
        char_length(btrim(name)) between 2 and 120
        and name = btrim(name)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.material_attributes'::regclass
      and conname = 'material_attributes_slug_format_check'
  ) then
    alter table public.material_attributes
      add constraint material_attributes_slug_format_check
      check (
        char_length(slug) between 2 and 120
        and slug = lower(slug)
        and slug ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.material_attributes'::regclass
      and conname = 'material_attributes_description_length_check'
  ) then
    alter table public.material_attributes
      add constraint material_attributes_description_length_check
      check (description is null or char_length(description) <= 600);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.material_attributes'::regclass
      and conname = 'material_attributes_sort_order_check'
  ) then
    alter table public.material_attributes
      add constraint material_attributes_sort_order_check
      check (sort_order between 0 and 1000000);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.material_attributes'::regclass
      and conname = 'material_attributes_unit_semantics_check'
  ) then
    alter table public.material_attributes
      add constraint material_attributes_unit_semantics_check
      check (
        (
          input_type = 'number'
          and unit is not null
          and char_length(btrim(unit)) between 1 and 30
          and unit = btrim(unit)
        )
        or
        (
          input_type <> 'number'
          and unit is null
        )
      );
  end if;
end;
$$;

alter table public.material_attribute_values
  drop constraint if exists material_attribute_values_attribute_id_fkey;

alter table public.material_attribute_values
  add constraint material_attribute_values_attribute_id_fkey
  foreign key (attribute_id)
  references public.material_attributes(id)
  on delete restrict;

alter table public.material_product_group_attributes
  drop constraint if exists material_product_group_attributes_attribute_id_fkey;

alter table public.material_product_group_attributes
  add constraint material_product_group_attributes_attribute_id_fkey
  foreign key (attribute_id)
  references public.material_attributes(id)
  on delete restrict;

create or replace function public.protect_material_attribute_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.slug is distinct from old.slug then
    raise exception using
      errcode = '22023',
      message = 'The permanent Materials Attribute key cannot be changed';
  end if;

  if new.input_type is distinct from old.input_type then
    raise exception using
      errcode = '22023',
      message = 'The permanent Materials Attribute input type cannot be changed';
  end if;

  if new.unit is distinct from old.unit then
    raise exception using
      errcode = '22023',
      message = 'The permanent Materials Attribute unit cannot be changed';
  end if;

  if new.scope is distinct from old.scope then
    raise exception using
      errcode = '22023',
      message = 'The permanent Materials Attribute scope cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_material_attribute_identity
  on public.material_attributes;

create trigger protect_material_attribute_identity
before update of slug, input_type, unit, scope
on public.material_attributes
for each row
execute function public.protect_material_attribute_identity();

create or replace function public.touch_material_attribute_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_material_attribute_updated_at
  on public.material_attributes;

create trigger touch_material_attribute_updated_at
before update on public.material_attributes
for each row
execute function public.touch_material_attribute_updated_at();

create or replace function public.prevent_material_attribute_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception using
    errcode = '22023',
    message = 'Materials Attributes use lifecycle deactivation and cannot be deleted';
end;
$$;

drop trigger if exists prevent_material_attribute_delete
  on public.material_attributes;

create trigger prevent_material_attribute_delete
before delete on public.material_attributes
for each row
execute function public.prevent_material_attribute_delete();

create index if not exists material_attributes_lifecycle_sort_idx
  on public.material_attributes (is_active, sort_order, name);

alter table public.material_attributes enable row level security;

drop policy if exists material_attributes_public_read_active
  on public.material_attributes;

create policy material_attributes_public_read_active
on public.material_attributes
for select
to anon, authenticated
using (is_active = true);

revoke insert, update, delete, truncate
on table public.material_attributes
from anon, authenticated;

grant select
on table public.material_attributes
to anon, authenticated;

grant select, insert, update, delete
on table public.material_attributes
to service_role;

comment on table public.material_attributes is
  'Reusable building and construction material specifications governed through protected master-admin APIs.';

comment on column public.material_attributes.slug is
  'Permanent Materials Attribute key, locked after creation.';

comment on column public.material_attributes.input_type is
  'Permanent answer type, locked after creation.';

comment on column public.material_attributes.unit is
  'Permanent unit for numeric specifications only; null for all other input types.';

comment on column public.material_attributes.scope is
  'Preserved legacy scope classification, locked after creation. Reuse is governed by Product Group mapping.';

comment on column public.material_attributes.is_active is
  'Lifecycle status. Inactive Attributes remain preserved for history.';

do $$
declare
  attribute_count bigint;
  value_count bigint;
  mapping_count bigint;
  legacy_answer_count bigint;
begin
  select count(*) into attribute_count
  from public.material_attributes;

  select count(*) into value_count
  from public.material_attribute_values;

  select count(*) into mapping_count
  from public.material_product_group_attributes;

  select count(*) into legacy_answer_count
  from public.property_listing_attribute_values;

  if attribute_count <> 16
     or value_count <> 0
     or mapping_count <> 5
     or legacy_answer_count <> 0 then
    raise exception 'Materials Attributes preservation verification failed';
  end if;

  if exists (
    select 1
    from public.material_attributes
    where input_type <> 'number'
      and unit is not null
  ) then
    raise exception 'A nonnumeric Materials Attribute still has a unit';
  end if;

  if exists (
    select 1
    from public.material_attributes
    where input_type = 'number'
      and nullif(btrim(unit), '') is null
  ) then
    raise exception 'A numeric Materials Attribute has no unit';
  end if;
end;
$$;

commit;
