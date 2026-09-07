begin;

-- Services Values production baseline verified on 2026-09-06:
--   service_attribute_values:           0 rows
--   service_attributes:                 0 rows
--   provider_service_attribute_values:  0 rows
--   provider_services:                901 rows
--   service_listings:                 500 rows
--   service_taxons:                   185 rows
--   v_service_catalog:                151 rows
--
-- This migration governs future controlled Services Values only. It creates
-- no Values, Attributes, mappings, provider services, listings or answers.
-- The existing v_service_attribute_values consumer contract is preserved.

do $$
declare
  value_count bigint;
  attribute_count bigint;
  answer_count bigint;
  provider_service_count bigint;
  listing_count bigint;
  taxon_count bigint;
  catalog_count bigint;
begin
  if to_regclass('public.service_attribute_values') is null
     or to_regclass('public.service_attributes') is null
     or to_regclass('public.provider_service_attribute_values') is null
     or to_regclass('public.provider_services') is null
     or to_regclass('public.service_listings') is null
     or to_regclass('public.service_taxons') is null
     or to_regclass('public.v_service_catalog') is null
     or to_regclass('public.v_service_attribute_values') is null then
    raise exception 'Services Values baseline relations are missing';
  end if;

  select count(*) into value_count
  from public.service_attribute_values;

  select count(*) into attribute_count
  from public.service_attributes;

  select count(*) into answer_count
  from public.provider_service_attribute_values;

  select count(*) into provider_service_count
  from public.provider_services;

  select count(*) into listing_count
  from public.service_listings;

  select count(*) into taxon_count
  from public.service_taxons;

  select count(*) into catalog_count
  from public.v_service_catalog;

  if value_count <> 0
     or attribute_count <> 0
     or answer_count <> 0
     or provider_service_count <> 901
     or listing_count <> 500
     or taxon_count <> 185
     or catalog_count <> 151 then
    raise exception
      'Services Values production baseline changed (values %, attributes %, answers %, provider services %, listings %, taxons %, catalog %)',
      value_count,
      attribute_count,
      answer_count,
      provider_service_count,
      listing_count,
      taxon_count,
      catalog_count;
  end if;
end;
$$;

alter table public.service_attribute_values
  add column if not exists description text,
  add column if not exists source text;

update public.service_attribute_values
set
  source = coalesce(nullif(btrim(source), ''), 'legacy'),
  sort_order = coalesce(sort_order, 1000),
  updated_at = coalesce(updated_at, now())
where source is null
   or btrim(source) = ''
   or sort_order is null
   or updated_at is null;

alter table public.service_attribute_values
  alter column source set default 'admin',
  alter column source set not null,
  alter column sort_order set default 1000,
  alter column sort_order set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.service_attribute_values
  drop constraint if exists service_attribute_values_value_format_check;
alter table public.service_attribute_values
  add constraint service_attribute_values_value_format_check
  check (
    value = btrim(value)
    and char_length(value) between 1 and 120
  );

alter table public.service_attribute_values
  drop constraint if exists service_attribute_values_slug_format_check;
alter table public.service_attribute_values
  add constraint service_attribute_values_slug_format_check
  check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 120
  );

alter table public.service_attribute_values
  drop constraint if exists service_attribute_values_description_length_check;
alter table public.service_attribute_values
  add constraint service_attribute_values_description_length_check
  check (description is null or char_length(description) <= 600);

alter table public.service_attribute_values
  drop constraint if exists service_attribute_values_sort_order_check;
alter table public.service_attribute_values
  add constraint service_attribute_values_sort_order_check
  check (sort_order between 0 and 1000000);

alter table public.service_attribute_values
  drop constraint if exists service_attribute_values_attribute_id_fkey;
alter table public.service_attribute_values
  add constraint service_attribute_values_attribute_id_fkey
  foreign key (attribute_id)
  references public.service_attributes(id)
  on delete restrict;

alter table public.service_attribute_values
  drop constraint if exists service_attribute_values_service_taxon_id_fkey;
alter table public.service_attribute_values
  add constraint service_attribute_values_service_taxon_id_fkey
  foreign key (service_taxon_id)
  references public.service_taxons(id)
  on delete restrict;

drop index if exists public.service_attr_values_scope_slug_uniq;

create unique index service_attribute_values_scope_slug_uidx
on public.service_attribute_values (
  attribute_id,
  (coalesce(service_taxon_id, '00000000-0000-0000-0000-000000000000'::uuid)),
  slug
);

create unique index service_attribute_values_scope_value_uidx
on public.service_attribute_values (
  attribute_id,
  (coalesce(service_taxon_id, '00000000-0000-0000-0000-000000000000'::uuid)),
  lower(value)
);

create index if not exists service_attribute_values_lifecycle_sort_idx
on public.service_attribute_values (
  attribute_id,
  service_taxon_id,
  is_active,
  sort_order,
  value
);

create or replace function public.validate_service_attribute_value_context()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  selected_input_type text;
  attribute_active boolean;
  selected_taxon_kind text;
  taxon_active boolean;
begin
  if tg_op = 'UPDATE' and new.is_active = false then
    return new;
  end if;

  select input_type, is_active
  into selected_input_type, attribute_active
  from public.service_attributes
  where id = new.attribute_id;

  if selected_input_type is null then
    raise exception using
      errcode = '23503',
      message = 'The selected Services Attribute does not exist.';
  end if;

  if selected_input_type not in ('single_select', 'multi_select') then
    raise exception using
      errcode = '22023',
      message = 'Controlled Services Values may only belong to single-select or multi-select Attributes.';
  end if;

  if attribute_active is not true then
    raise exception using
      errcode = '22023',
      message = 'Reactivate the parent Services Attribute before saving this Value.';
  end if;

  if new.service_taxon_id is not null then
    select kind::text, is_active
    into selected_taxon_kind, taxon_active
    from public.service_taxons
    where id = new.service_taxon_id;

    if selected_taxon_kind is null or selected_taxon_kind <> 'service' then
      raise exception using
        errcode = '22023',
        message = 'A Service-specific Value must reference an individual Service.';
    end if;

    if taxon_active is not true then
      raise exception using
        errcode = '22023',
        message = 'Reactivate the individual Service before saving this Value.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_service_attribute_value_context
  on public.service_attribute_values;
create trigger validate_service_attribute_value_context
before insert or update on public.service_attribute_values
for each row
execute function public.validate_service_attribute_value_context();

create or replace function public.protect_service_attribute_value_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.attribute_id is distinct from old.attribute_id
     or new.service_taxon_id is distinct from old.service_taxon_id
     or new.slug is distinct from old.slug then
    raise exception using
      errcode = '22023',
      message = 'The Services Value permanent key, parent Attribute and Service scope are locked after creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_service_attribute_value_identity
  on public.service_attribute_values;
create trigger protect_service_attribute_value_identity
before update on public.service_attribute_values
for each row
execute function public.protect_service_attribute_value_identity();

create or replace function public.touch_service_attribute_value_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_service_attribute_value_updated_at
  on public.service_attribute_values;
create trigger touch_service_attribute_value_updated_at
before update on public.service_attribute_values
for each row
execute function public.touch_service_attribute_value_updated_at();

create or replace function public.prevent_service_attribute_value_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception using
    errcode = '22023',
    message = 'Services Values are lifecycle-managed and cannot be deleted. Deactivate the record instead.';
end;
$$;

drop trigger if exists prevent_service_attribute_value_delete
  on public.service_attribute_values;
create trigger prevent_service_attribute_value_delete
before delete on public.service_attribute_values
for each row
execute function public.prevent_service_attribute_value_delete();

alter table public.service_attribute_values enable row level security;

drop policy if exists service_attribute_values_public_read_active
  on public.service_attribute_values;
drop policy if exists service_attribute_values_admin_all
  on public.service_attribute_values;
drop policy if exists service_attribute_values_authenticated_write
  on public.service_attribute_values;
drop policy if exists service_attribute_values_insert
  on public.service_attribute_values;
drop policy if exists service_attribute_values_update
  on public.service_attribute_values;
drop policy if exists service_attribute_values_delete
  on public.service_attribute_values;

create policy service_attribute_values_public_read_active
on public.service_attribute_values
for select
to anon, authenticated
using (is_active = true);

revoke insert, update, delete, truncate, references, trigger
on table public.service_attribute_values
from anon, authenticated;

grant select
on table public.service_attribute_values
to anon, authenticated;

grant select, insert, update, delete
on table public.service_attribute_values
to service_role;

comment on table public.service_attribute_values is
  'Lifecycle-managed controlled Services choices. Administrative writes use the protected Master Administrator API.';

comment on column public.service_attribute_values.attribute_id is
  'Permanent parent Services Attribute identity.';

comment on column public.service_attribute_values.service_taxon_id is
  'Permanent optional individual-Service scope. Null means reusable under the parent Attribute.';

comment on column public.service_attribute_values.slug is
  'Permanent controlled-value key, locked after creation.';

comment on column public.service_attribute_values.description is
  'Administrator-reviewed explanation of the controlled Services option.';

comment on column public.service_attribute_values.source is
  'Catalogue provenance. AI suggestions remain advisory and never save automatically.';

comment on column public.service_attribute_values.is_active is
  'Lifecycle status. Inactive Values remain preserved for historical compatibility.';

do $$
declare
  trigger_count bigint;
begin
  if (select count(*) from public.service_attribute_values) <> 0
     or (select count(*) from public.service_attributes) <> 0
     or (select count(*) from public.provider_service_attribute_values) <> 0
     or (select count(*) from public.provider_services) <> 901
     or (select count(*) from public.service_listings) <> 500
     or (select count(*) from public.service_taxons) <> 185
     or (select count(*) from public.v_service_catalog) <> 151 then
    raise exception 'Services Values preservation verification failed';
  end if;

  select count(*) into trigger_count
  from pg_trigger
  where tgrelid = 'public.service_attribute_values'::regclass
    and not tgisinternal
    and tgname in (
      'validate_service_attribute_value_context',
      'protect_service_attribute_value_identity',
      'touch_service_attribute_value_updated_at',
      'prevent_service_attribute_value_delete'
    );

  if trigger_count <> 4 then
    raise exception 'Services Values governance trigger verification failed';
  end if;

  if to_regclass('public.v_service_attribute_values') is null then
    raise exception 'Services Values consumer view was not preserved';
  end if;
end;
$$;

commit;
