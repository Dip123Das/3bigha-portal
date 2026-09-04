begin;

-- Materials Taxonomy production baseline verified on 2026-09-04:
--   material_taxons:                         66 rows
--   active taxons:                           65 rows
--   types/categories/subcategories/groups: 24/11/28/3
--   material listings:                        7 rows
--   subcategories without product group:     16 rows
--
-- Preserve every existing identity and listing relationship. The historical
-- Cement product-group UUID is normalized in place to the global-product-group
-- model used by material_subcategory_product_groups.

alter table public.material_taxons
  add column if not exists description text,
  add column if not exists source text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.material_taxons
set
  source = coalesce(nullif(btrim(source), ''), 'legacy'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where source is null
   or btrim(source) = ''
   or created_at is null
   or updated_at is null;

alter table public.material_taxons
  alter column source set default 'admin',
  alter column source set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.material_taxons
  drop constraint if exists material_taxons_name_not_blank;
alter table public.material_taxons
  add constraint material_taxons_name_not_blank
  check (length(btrim(name)) > 0);

alter table public.material_taxons
  drop constraint if exists material_taxons_slug_not_blank;
alter table public.material_taxons
  add constraint material_taxons_slug_not_blank
  check (length(btrim(slug)) > 0);

alter table public.material_taxons
  drop constraint if exists material_taxons_slug_format_check;
alter table public.material_taxons
  add constraint material_taxons_slug_format_check
  check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

alter table public.material_taxons
  drop constraint if exists material_taxons_sort_order_check;
alter table public.material_taxons
  add constraint material_taxons_sort_order_check
  check (sort_order between 0 and 1000000);

alter table public.material_taxons
  drop constraint if exists material_taxons_description_length_check;
alter table public.material_taxons
  add constraint material_taxons_description_length_check
  check (description is null or length(description) <= 600);

-- Normalize the one verified legacy product group without replacing its UUID.
update public.material_taxons
set
  parent_id = null,
  description = coalesce(
    description,
    'Reusable cement product group for mapped cement subcategories.'
  ),
  updated_at = now()
where id = '5bdb9323-19bd-41a8-a0d2-83f350aa0362'::uuid
  and kind = 'product_group'
  and slug = 'cement'
  and parent_id = '90d916db-6134-424f-bb8a-9524d9e88cee'::uuid;

do $$
begin
  if exists (
    select 1
    from public.material_taxons
    where (kind = 'type' and parent_id is not null)
       or (kind = 'product_group' and parent_id is not null)
  ) then
    raise exception 'Materials migration stopped: a root or product group still has a parent.';
  end if;

  if exists (
    select 1
    from public.material_taxons child
    left join public.material_taxons parent on parent.id = child.parent_id
    where (child.kind = 'category' and parent.kind is distinct from 'type')
       or (child.kind = 'subcategory' and parent.kind is distinct from 'category')
  ) then
    raise exception 'Materials migration stopped: an invalid category or subcategory parent exists.';
  end if;
end;
$$;

alter table public.material_taxons
  drop constraint if exists material_taxons_parent_id_fkey;
alter table public.material_taxons
  add constraint material_taxons_parent_id_fkey
  foreign key (parent_id)
  references public.material_taxons(id)
  on delete restrict;

create unique index if not exists material_taxons_normalized_kind_slug_uidx
on public.material_taxons (kind, lower(btrim(slug)));

create index if not exists material_taxons_active_parent_kind_sort_idx
on public.material_taxons (is_active, parent_id, kind, sort_order, name);

create or replace function public.validate_material_taxonomy_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_kind public.material_taxon_kind;
  parent_active boolean;
begin
  if new.kind in ('type', 'product_group') then
    if new.parent_id is not null then
      raise exception 'Material % must be global and cannot have a parent.', new.kind
        using errcode = '22023';
    end if;
    return new;
  end if;

  if new.parent_id is null then
    raise exception 'Material % requires a parent.', new.kind
      using errcode = '22023';
  end if;

  select kind, is_active
  into parent_kind, parent_active
  from public.material_taxons
  where id = new.parent_id;

  if new.kind = 'category' and parent_kind is distinct from 'type' then
    raise exception 'Material category must belong to a material type.'
      using errcode = '22023';
  end if;

  if new.kind = 'subcategory' and parent_kind is distinct from 'category' then
    raise exception 'Material subcategory must belong to a material category.'
      using errcode = '22023';
  end if;

  if parent_active is distinct from true then
    raise exception 'The selected material taxonomy parent is inactive.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_material_taxonomy_hierarchy
  on public.material_taxons;
create trigger validate_material_taxonomy_hierarchy
before insert or update of kind, parent_id
on public.material_taxons
for each row
execute function public.validate_material_taxonomy_hierarchy();

create or replace function public.protect_material_taxonomy_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind is distinct from old.kind then
    raise exception 'Material taxonomy kind is permanent and cannot be changed.'
      using errcode = '22023';
  end if;

  if new.parent_id is distinct from old.parent_id then
    raise exception 'Material taxonomy parent relationship is permanent and cannot be changed.'
      using errcode = '22023';
  end if;

  if new.slug is distinct from old.slug then
    raise exception 'Material taxonomy permanent key cannot be changed.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_material_taxonomy_identity
  on public.material_taxons;
create trigger protect_material_taxonomy_identity
before update on public.material_taxons
for each row
execute function public.protect_material_taxonomy_identity();

create or replace function public.touch_material_taxonomy_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_material_taxonomy_updated_at
  on public.material_taxons;
create trigger touch_material_taxonomy_updated_at
before update on public.material_taxons
for each row
execute function public.touch_material_taxonomy_updated_at();

alter table public.material_subcategory_product_groups
  add column if not exists is_active boolean,
  add column if not exists updated_at timestamptz;

update public.material_subcategory_product_groups
set
  is_active = coalesce(is_active, true),
  updated_at = coalesce(updated_at, created_at, now())
where is_active is null or updated_at is null;

alter table public.material_subcategory_product_groups
  alter column is_active set default true,
  alter column is_active set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.material_subcategory_product_groups
  drop constraint if exists material_subcategory_product_groups_subcategory_id_fkey;
alter table public.material_subcategory_product_groups
  add constraint material_subcategory_product_groups_subcategory_id_fkey
  foreign key (subcategory_id)
  references public.material_taxons(id)
  on delete restrict;

alter table public.material_subcategory_product_groups
  drop constraint if exists material_subcategory_product_groups_product_group_id_fkey;
alter table public.material_subcategory_product_groups
  add constraint material_subcategory_product_groups_product_group_id_fkey
  foreign key (product_group_id)
  references public.material_taxons(id)
  on delete restrict;

drop trigger if exists trg_validate_subcat_pg
  on public.material_subcategory_product_groups;
drop trigger if exists validate_subcat_pg
  on public.material_subcategory_product_groups;
drop trigger if exists validate_material_subcategory_product_group
  on public.material_subcategory_product_groups;

create trigger validate_material_subcategory_product_group
before insert or update
on public.material_subcategory_product_groups
for each row
execute function public.trg_validate_subcat_pg();

create or replace function public.protect_material_subcategory_product_group_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subcategory_id is distinct from old.subcategory_id
     or new.product_group_id is distinct from old.product_group_id then
    raise exception 'Material subcategory and product-group relationships are permanent.'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_material_subcategory_product_group_identity
  on public.material_subcategory_product_groups;
create trigger protect_material_subcategory_product_group_identity
before update on public.material_subcategory_product_groups
for each row
execute function public.protect_material_subcategory_product_group_identity();

create or replace function public.touch_material_subcategory_product_group_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_material_subcategory_product_group_updated_at
  on public.material_subcategory_product_groups;
create trigger touch_material_subcategory_product_group_updated_at
before update on public.material_subcategory_product_groups
for each row
execute function public.touch_material_subcategory_product_group_updated_at();

alter table public.material_product_group_attributes
  drop constraint if exists material_product_group_attributes_product_group_id_fkey;
alter table public.material_product_group_attributes
  add constraint material_product_group_attributes_product_group_id_fkey
  foreign key (product_group_id)
  references public.material_taxons(id)
  on delete restrict;

alter table public.material_attribute_values
  drop constraint if exists material_attribute_values_product_group_fk;
alter table public.material_attribute_values
  add constraint material_attribute_values_product_group_fk
  foreign key (product_group_id)
  references public.material_taxons(id)
  on delete restrict;

create or replace view public.v_material_product_group_hierarchy as
select
  mapping.subcategory_id,
  sc.name as subcategory_name,
  cat.id as category_id,
  cat.name as category_name,
  typ.id as type_id,
  typ.name as type_name,
  pg.id as product_group_id,
  pg.name as product_group_name,
  typ.name || ' > ' || cat.name || ' > ' || sc.name || ' > ' || pg.name
    as full_path
from public.material_subcategory_product_groups mapping
join public.material_taxons sc
  on sc.id = mapping.subcategory_id
 and sc.kind = 'subcategory'
join public.material_taxons cat
  on cat.id = sc.parent_id
 and cat.kind = 'category'
join public.material_taxons typ
  on typ.id = cat.parent_id
 and typ.kind = 'type'
join public.material_taxons pg
  on pg.id = mapping.product_group_id
 and pg.kind = 'product_group'
where mapping.is_active
  and sc.is_active
  and cat.is_active
  and typ.is_active
  and pg.is_active;

create or replace view public.v_public_material_product_groups as
select
  pg.id as product_group_id,
  pg.name as product_group_name,
  pg.slug as product_group_slug,
  sc.id as subcategory_id,
  sc.name as subcategory_name,
  sc.slug as subcategory_slug,
  cat.id as category_id,
  cat.name as category_name,
  cat.slug as category_slug,
  typ.id as type_id,
  typ.name as type_name,
  typ.slug as type_slug
from public.material_subcategory_product_groups mapping
join public.material_taxons sc
  on sc.id = mapping.subcategory_id
 and sc.kind = 'subcategory'
join public.material_taxons cat
  on cat.id = sc.parent_id
 and cat.kind = 'category'
join public.material_taxons typ
  on typ.id = cat.parent_id
 and typ.kind = 'type'
join public.material_taxons pg
  on pg.id = mapping.product_group_id
 and pg.kind = 'product_group'
where mapping.is_active
  and sc.is_active
  and cat.is_active
  and typ.is_active
  and pg.is_active;

alter table public.material_taxons enable row level security;
alter table public.material_subcategory_product_groups enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'material_taxons',
        'material_subcategory_product_groups'
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

revoke insert, update, delete, truncate, references, trigger
on table public.material_taxons
from anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
on table public.material_subcategory_product_groups
from anon, authenticated;

grant select on table public.material_taxons to anon, authenticated;
grant select on table public.material_subcategory_product_groups to anon, authenticated;
grant select on table public.v_public_material_product_groups to anon, authenticated;

comment on column public.material_taxons.slug is
  'Permanent Materials Taxonomy machine key. It must not change after creation.';
comment on column public.material_taxons.parent_id is
  'Permanent parent relationship. Types and reusable Product Groups are global.';
comment on column public.material_taxons.kind is
  'Permanent Materials Taxonomy hierarchy level.';
comment on column public.material_taxons.description is
  'Human-reviewed construction-material description. AI may advise but never save it automatically.';
comment on column public.material_subcategory_product_groups.subcategory_id is
  'Permanent Subcategory identity for this reusable Product Group relationship.';
comment on column public.material_subcategory_product_groups.product_group_id is
  'Permanent reusable Materials Product Group identity.';
comment on column public.material_subcategory_product_groups.is_active is
  'Lifecycle status. Inactive relationships remain preserved for history.';

commit;
