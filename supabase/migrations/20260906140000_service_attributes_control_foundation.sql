begin;

-- Services Attributes production baseline verified on 2026-09-06:
--   service_attributes:                    0 rows
--   service_attribute_values:              0 rows
--   service_attribute_mappings:            0 rows
--   service_product_group_attributes:      0 rows
--   provider_service_attribute_values:     0 rows
--   provider_services:                   901 rows
--   service_listings:                    500 rows
--
-- This migration creates governance for future reusable Services Attributes.
-- It does not create, delete or remap catalogue, provider or listing records.

do $$
declare
  attribute_count bigint;
  value_count bigint;
  direct_mapping_count bigint;
  product_group_mapping_count bigint;
  historical_answer_count bigint;
  provider_service_count bigint;
  service_listing_count bigint;
begin
  if to_regclass('public.service_attributes') is null
     or to_regclass('public.service_attribute_values') is null
     or to_regclass('public.service_attribute_mappings') is null
     or to_regclass('public.service_product_group_attributes') is null
     or to_regclass('public.provider_service_attribute_values') is null
     or to_regclass('public.provider_services') is null
     or to_regclass('public.service_listings') is null then
    raise exception 'Services Attributes baseline tables are missing';
  end if;

  select count(*) into attribute_count
  from public.service_attributes;

  select count(*) into value_count
  from public.service_attribute_values;

  select count(*) into direct_mapping_count
  from public.service_attribute_mappings;

  select count(*) into product_group_mapping_count
  from public.service_product_group_attributes;

  select count(*) into historical_answer_count
  from public.provider_service_attribute_values;

  select count(*) into provider_service_count
  from public.provider_services;

  select count(*) into service_listing_count
  from public.service_listings;

  if attribute_count <> 0
     or value_count <> 0
     or direct_mapping_count <> 0
     or product_group_mapping_count <> 0
     or historical_answer_count <> 0
     or provider_service_count <> 901
     or service_listing_count <> 500 then
    raise exception
      'Services Attributes baseline changed (attributes %, values %, direct mappings %, product-group mappings %, historical answers %, provider services %, service listings %)',
      attribute_count,
      value_count,
      direct_mapping_count,
      product_group_mapping_count,
      historical_answer_count,
      provider_service_count,
      service_listing_count;
  end if;
end;
$$;

alter table public.service_attributes
  add column if not exists description text,
  add column if not exists source text,
  add column if not exists scope text;

update public.service_attributes
set source = 'legacy'
where source is null or btrim(source) = '';

update public.service_attributes
set scope = 'global'
where scope is null or btrim(scope) = '';

alter table public.service_attributes
  alter column source set default 'admin',
  alter column source set not null,
  alter column scope set default 'global',
  alter column scope set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.service_attributes'::regclass
      and conname = 'service_attributes_name_format_check'
  ) then
    alter table public.service_attributes
      add constraint service_attributes_name_format_check
      check (
        char_length(btrim(name)) between 2 and 120
        and name = btrim(name)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.service_attributes'::regclass
      and conname = 'service_attributes_slug_format_check'
  ) then
    alter table public.service_attributes
      add constraint service_attributes_slug_format_check
      check (
        char_length(slug) between 2 and 120
        and slug = lower(slug)
        and slug ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.service_attributes'::regclass
      and conname = 'service_attributes_description_length_check'
  ) then
    alter table public.service_attributes
      add constraint service_attributes_description_length_check
      check (description is null or char_length(description) <= 600);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.service_attributes'::regclass
      and conname = 'service_attributes_sort_order_check'
  ) then
    alter table public.service_attributes
      add constraint service_attributes_sort_order_check
      check (sort_order between 0 and 1000000);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.service_attributes'::regclass
      and conname = 'service_attributes_scope_check'
  ) then
    alter table public.service_attributes
      add constraint service_attributes_scope_check
      check (scope in ('global', 'product_specific'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.service_attributes'::regclass
      and conname = 'service_attributes_unit_semantics_check'
  ) then
    alter table public.service_attributes
      add constraint service_attributes_unit_semantics_check
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

-- Every relationship to a reusable Attribute is history-preserving.
alter table public.service_attribute_values
  drop constraint if exists service_attribute_values_attribute_id_fkey;

alter table public.service_attribute_values
  add constraint service_attribute_values_attribute_id_fkey
  foreign key (attribute_id)
  references public.service_attributes(id)
  on delete restrict;

alter table public.service_attribute_mappings
  drop constraint if exists service_attribute_mappings_attribute_id_fkey;

alter table public.service_attribute_mappings
  add constraint service_attribute_mappings_attribute_id_fkey
  foreign key (attribute_id)
  references public.service_attributes(id)
  on delete restrict;

alter table public.service_product_group_attributes
  drop constraint if exists fk_service_pga_attribute,
  drop constraint if exists service_product_group_attributes_attribute_id_fkey;

alter table public.service_product_group_attributes
  add constraint service_product_group_attributes_attribute_id_fkey
  foreign key (attribute_id)
  references public.service_attributes(id)
  on delete restrict;

alter table public.provider_service_attribute_values
  drop constraint if exists provider_service_attribute_values_attribute_id_fkey;

alter table public.provider_service_attribute_values
  add constraint provider_service_attribute_values_attribute_id_fkey
  foreign key (attribute_id)
  references public.service_attributes(id)
  on delete restrict;

create unique index if not exists service_attributes_normalized_slug_uidx
on public.service_attributes (lower(btrim(slug)));

create unique index if not exists service_attributes_normalized_name_uidx
on public.service_attributes (lower(btrim(name)));

create index if not exists service_attributes_active_scope_sort_idx
on public.service_attributes (is_active, scope, sort_order, name);

create or replace function public.protect_service_attribute_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.slug is distinct from old.slug then
    raise exception using
      errcode = '22023',
      message = 'The permanent Services Attribute key cannot be changed';
  end if;

  if new.input_type is distinct from old.input_type then
    raise exception using
      errcode = '22023',
      message = 'The permanent Services Attribute answer type cannot be changed';
  end if;

  if new.unit is distinct from old.unit then
    raise exception using
      errcode = '22023',
      message = 'The permanent Services Attribute unit cannot be changed';
  end if;

  if new.scope is distinct from old.scope then
    raise exception using
      errcode = '22023',
      message = 'The permanent Services Attribute scope cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_service_attribute_identity
  on public.service_attributes;

create trigger protect_service_attribute_identity
before update of slug, input_type, unit, scope
on public.service_attributes
for each row
execute function public.protect_service_attribute_identity();

create or replace function public.touch_service_attribute_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_service_attribute_updated_at
  on public.service_attributes;

create trigger touch_service_attribute_updated_at
before update
on public.service_attributes
for each row
execute function public.touch_service_attribute_updated_at();

alter table public.service_attributes enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'service_attributes'
      and cmd <> 'SELECT'
  loop
    execute format(
      'drop policy if exists %I on public.service_attributes',
      policy_row.policyname
    );
  end loop;
end;
$$;

revoke insert, update, delete, truncate, references, trigger
on table public.service_attributes
from anon, authenticated;

grant select on table public.service_attributes to anon, authenticated;

comment on column public.service_attributes.slug is
  'Permanent Services Attribute machine key. It cannot change after creation.';
comment on column public.service_attributes.input_type is
  'Permanent answer type: text, number, boolean, single_select or multi_select.';
comment on column public.service_attributes.unit is
  'Permanent measurement unit used only by number Attributes.';
comment on column public.service_attributes.scope is
  'Permanent reuse scope: global or product_specific.';
comment on column public.service_attributes.description is
  'Human-reviewed Services Attribute guidance. AI may advise but never save automatically.';
comment on column public.service_attributes.source is
  'Catalogue provenance. Existing rows are legacy; new administrator rows use admin.';

do $$
begin
  if (select count(*) from public.service_attributes) <> 0
     or (select count(*) from public.service_attribute_values) <> 0
     or (select count(*) from public.service_attribute_mappings) <> 0
     or (select count(*) from public.service_product_group_attributes) <> 0
     or (select count(*) from public.provider_service_attribute_values) <> 0
     or (select count(*) from public.provider_services) <> 901
     or (select count(*) from public.service_listings) <> 500 then
    raise exception 'Services Attributes migration stopped: post-migration production counts changed';
  end if;
end;
$$;

commit;
