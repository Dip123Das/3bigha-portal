begin;

-- Materials Values production baseline verified on 2026-09-04:
--   material_attribute_values:             0 rows
--   active controlled-choice Attributes:   9 rows
--   Materials Product Groups:              3 rows
--   material_product_group_attributes:     5 rows
--   material_listings:                     7 rows
--
-- This migration establishes lifecycle-only, server-administered controlled
-- Values without creating catalogue records or changing existing Attributes,
-- mappings, listings, or historical answers.

do $$
declare
  value_count bigint;
  attribute_count bigint;
  mapping_count bigint;
  listing_count bigint;
begin
  if to_regclass('public.material_attribute_values') is null
     or to_regclass('public.material_attributes') is null
     or to_regclass('public.material_taxons') is null then
    raise exception 'Materials Values foundation tables are missing';
  end if;

  select count(*) into value_count
  from public.material_attribute_values;

  select count(*) into attribute_count
  from public.material_attributes;

  select count(*) into mapping_count
  from public.material_product_group_attributes;

  select count(*) into listing_count
  from public.material_listings;

  if value_count <> 0
     or attribute_count <> 16
     or mapping_count <> 5
     or listing_count <> 7 then
    raise exception
      'Materials Values production baseline changed: values %, attributes %, mappings %, listings %',
      value_count,
      attribute_count,
      mapping_count,
      listing_count;
  end if;
end;
$$;

alter table public.material_attribute_values
  add column if not exists description text,
  add column if not exists source text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.material_attribute_values
set
  slug = coalesce(nullif(btrim(slug), ''),
    regexp_replace(
      regexp_replace(lower(btrim(value)), '[^a-z0-9]+', '-', 'g'),
      '(^-|-$)', '', 'g'
    )
  ),
  source = coalesce(nullif(btrim(source), ''), 'legacy'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where slug is null
   or btrim(slug) = ''
   or source is null
   or btrim(source) = ''
   or created_at is null
   or updated_at is null;

alter table public.material_attribute_values
  alter column slug set not null,
  alter column source set default 'admin',
  alter column source set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.material_attribute_values
  drop constraint if exists material_attribute_values_attribute_id_value_key;

alter table public.material_attribute_values
  drop constraint if exists material_attribute_values_value_format_check;
alter table public.material_attribute_values
  add constraint material_attribute_values_value_format_check
  check (
    value = btrim(value)
    and char_length(value) between 1 and 120
  );

alter table public.material_attribute_values
  drop constraint if exists material_attribute_values_slug_format_check;
alter table public.material_attribute_values
  add constraint material_attribute_values_slug_format_check
  check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 120
  );

alter table public.material_attribute_values
  drop constraint if exists material_attribute_values_description_length_check;
alter table public.material_attribute_values
  add constraint material_attribute_values_description_length_check
  check (description is null or char_length(description) <= 600);

alter table public.material_attribute_values
  drop constraint if exists material_attribute_values_sort_order_check;
alter table public.material_attribute_values
  add constraint material_attribute_values_sort_order_check
  check (sort_order between 0 and 1000000);

alter table public.material_attribute_values
  drop constraint if exists material_attribute_values_attribute_id_fkey;
alter table public.material_attribute_values
  add constraint material_attribute_values_attribute_id_fkey
  foreign key (attribute_id)
  references public.material_attributes(id)
  on delete restrict;

alter table public.material_attribute_values
  drop constraint if exists material_attribute_values_product_group_fk;
alter table public.material_attribute_values
  add constraint material_attribute_values_product_group_fk
  foreign key (product_group_id)
  references public.material_taxons(id)
  on delete restrict;

create unique index if not exists material_attribute_values_scope_value_uidx
  on public.material_attribute_values (
    attribute_id,
    (coalesce(product_group_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    lower(value)
  );

create unique index if not exists material_attribute_values_scope_slug_uidx
  on public.material_attribute_values (
    attribute_id,
    (coalesce(product_group_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    slug
  );

create index if not exists material_attribute_values_lifecycle_sort_idx
  on public.material_attribute_values (
    attribute_id,
    product_group_id,
    is_active,
    sort_order,
    value
  );

create or replace function public.validate_material_attribute_value_context()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  selected_input_type text;
  attribute_active boolean;
  selected_kind public.material_taxon_kind;
  product_group_active boolean;
begin
  if tg_op = 'UPDATE' and new.is_active = false then
    return new;
  end if;

  select input_type, is_active
  into selected_input_type, attribute_active
  from public.material_attributes
  where id = new.attribute_id;

  if selected_input_type is null then
    raise exception using
      errcode = '23503',
      message = 'The selected Materials Attribute does not exist.';
  end if;

  if selected_input_type not in ('single_select', 'multi_select') then
    raise exception using
      errcode = '22023',
      message = 'Controlled Materials Values may only belong to single-select or multi-select Attributes.';
  end if;

  if attribute_active is not true then
    raise exception using
      errcode = '22023',
      message = 'Reactivate the parent Materials Attribute before saving this Value.';
  end if;

  if new.product_group_id is not null then
    select kind, is_active
    into selected_kind, product_group_active
    from public.material_taxons
    where id = new.product_group_id;

    if selected_kind is null or selected_kind <> 'product_group' then
      raise exception using
        errcode = '22023',
        message = 'A Product-Group-specific Value must reference a Materials Product Group.';
    end if;

    if product_group_active is not true then
      raise exception using
        errcode = '22023',
        message = 'Reactivate the Materials Product Group before saving this Value.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_material_attribute_value_context
  on public.material_attribute_values;

create trigger validate_material_attribute_value_context
before insert or update on public.material_attribute_values
for each row
execute function public.validate_material_attribute_value_context();

create or replace function public.protect_material_attribute_value_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.attribute_id is distinct from old.attribute_id
     or new.product_group_id is distinct from old.product_group_id
     or new.slug is distinct from old.slug then
    raise exception using
      errcode = '22023',
      message = 'The Materials Value permanent key, parent Attribute and Product Group scope are locked after creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_material_attribute_value_identity
  on public.material_attribute_values;

create trigger protect_material_attribute_value_identity
before update on public.material_attribute_values
for each row
execute function public.protect_material_attribute_value_identity();

create or replace function public.touch_material_attribute_value_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_material_attribute_value_updated_at
  on public.material_attribute_values;

create trigger touch_material_attribute_value_updated_at
before update on public.material_attribute_values
for each row
execute function public.touch_material_attribute_value_updated_at();

create or replace function public.prevent_material_attribute_value_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception using
    errcode = '22023',
    message = 'Materials Values are lifecycle-managed and cannot be deleted. Deactivate the record instead.';
end;
$$;

drop trigger if exists prevent_material_attribute_value_delete
  on public.material_attribute_values;

create trigger prevent_material_attribute_value_delete
before delete on public.material_attribute_values
for each row
execute function public.prevent_material_attribute_value_delete();

alter table public.material_attribute_values enable row level security;

drop policy if exists material_attribute_values_public_read_active
  on public.material_attribute_values;

create policy material_attribute_values_public_read_active
on public.material_attribute_values
for select
to anon, authenticated
using (is_active = true);

revoke insert, update, delete, truncate
on table public.material_attribute_values
from anon, authenticated;

grant select
on table public.material_attribute_values
to anon, authenticated;

grant select, insert, update, delete
on table public.material_attribute_values
to service_role;

comment on table public.material_attribute_values is
  'Lifecycle-managed controlled Materials choices. Administrative writes use the protected master-admin API.';

comment on column public.material_attribute_values.attribute_id is
  'Permanent parent Materials Attribute identity.';

comment on column public.material_attribute_values.product_group_id is
  'Permanent optional Materials Product Group scope. Null means globally reusable under the parent Attribute.';

comment on column public.material_attribute_values.slug is
  'Permanent controlled-value key, locked after creation.';

comment on column public.material_attribute_values.is_active is
  'Lifecycle status. Inactive Values remain preserved for history.';

do $$
declare
  value_count bigint;
  attribute_count bigint;
  mapping_count bigint;
  listing_count bigint;
  trigger_count bigint;
begin
  select count(*) into value_count
  from public.material_attribute_values;

  select count(*) into attribute_count
  from public.material_attributes;

  select count(*) into mapping_count
  from public.material_product_group_attributes;

  select count(*) into listing_count
  from public.material_listings;

  select count(*) into trigger_count
  from pg_trigger
  where tgrelid = 'public.material_attribute_values'::regclass
    and not tgisinternal
    and tgname in (
      'validate_material_attribute_value_context',
      'protect_material_attribute_value_identity',
      'touch_material_attribute_value_updated_at',
      'prevent_material_attribute_value_delete'
    );

  if value_count <> 0
     or attribute_count <> 16
     or mapping_count <> 5
     or listing_count <> 7
     or trigger_count <> 4 then
    raise exception 'Materials Values preservation verification failed';
  end if;

  if exists (
    select 1
    from public.material_attribute_values value_row
    join public.material_attributes attribute_row
      on attribute_row.id = value_row.attribute_id
    where attribute_row.input_type not in ('single_select', 'multi_select')
  ) then
    raise exception 'A controlled Materials Value has an invalid parent Attribute type';
  end if;
end;
$$;

commit;
