begin;

-- Production baseline verified 2026-09-06:
--   service_taxons: 185 rows (2 categories, 32 subcategories, 151 services)
--   active taxons: 185
--   orphan/invalid/duplicate hierarchy records: 0
--   provider_services rows using service_taxon_id: 0
-- Preserve every existing UUID, name, key, relationship and timestamp.

do $$
begin
  if (select count(*) from public.service_taxons) <> 185
     or (select count(*) from public.service_taxons where kind = 'category') <> 2
     or (select count(*) from public.service_taxons where kind = 'subcategory') <> 32
     or (select count(*) from public.service_taxons where kind = 'service') <> 151
     or (select count(*) from public.service_taxons where is_active) <> 185 then
    raise exception 'Services Taxonomy migration stopped: production baseline counts changed.';
  end if;

  if exists (
    select 1
    from public.service_taxons child
    left join public.service_taxons parent on parent.id = child.parent_id
    where (child.kind = 'category' and child.parent_id is not null)
       or (child.kind = 'subcategory' and parent.kind is distinct from 'category')
       or (child.kind = 'service' and parent.kind is distinct from 'subcategory')
  ) then
    raise exception 'Services Taxonomy migration stopped: invalid hierarchy detected.';
  end if;

  if exists (
    select 1
    from public.service_taxons
    where nullif(btrim(name), '') is null
       or nullif(btrim(slug), '') is null
       or slug <> lower(slug)
       or slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
       or sort_order < 0
       or sort_order > 1000000
  ) then
    raise exception 'Services Taxonomy migration stopped: invalid identity data detected.';
  end if;
end;
$$;

alter table public.service_taxons
  add column if not exists description text,
  add column if not exists source text;

update public.service_taxons
set source = 'legacy'
where source is null or btrim(source) = '';

alter table public.service_taxons
  alter column source set default 'admin',
  alter column source set not null;

alter table public.service_taxons
  drop constraint if exists service_taxons_name_not_blank;
alter table public.service_taxons
  add constraint service_taxons_name_not_blank
  check (length(btrim(name)) > 0);

alter table public.service_taxons
  drop constraint if exists service_taxons_slug_not_blank;
alter table public.service_taxons
  add constraint service_taxons_slug_not_blank
  check (length(btrim(slug)) > 0);

alter table public.service_taxons
  drop constraint if exists service_taxons_slug_format_check;
alter table public.service_taxons
  add constraint service_taxons_slug_format_check
  check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

alter table public.service_taxons
  drop constraint if exists service_taxons_sort_order_check;
alter table public.service_taxons
  add constraint service_taxons_sort_order_check
  check (sort_order between 0 and 1000000);

alter table public.service_taxons
  drop constraint if exists service_taxons_description_length_check;
alter table public.service_taxons
  add constraint service_taxons_description_length_check
  check (description is null or length(description) <= 600);

alter table public.service_taxons
  drop constraint if exists service_taxons_parent_id_fkey;
alter table public.service_taxons
  add constraint service_taxons_parent_id_fkey
  foreign key (parent_id)
  references public.service_taxons(id)
  on delete restrict;

create unique index if not exists service_taxons_normalized_kind_slug_uidx
on public.service_taxons (kind, lower(btrim(slug)));

create index if not exists service_taxons_active_parent_kind_sort_idx
on public.service_taxons (is_active, parent_id, kind, sort_order, name);

create or replace function public.validate_service_taxonomy_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_kind public.service_taxon_kind;
  parent_active boolean;
begin
  if new.kind = 'category' then
    if new.parent_id is not null then
      raise exception 'A Services Category cannot have a parent.' using errcode = '22023';
    end if;
    return new;
  end if;

  if new.parent_id is null then
    raise exception 'A Services % requires a parent.', new.kind using errcode = '22023';
  end if;

  select kind, is_active into parent_kind, parent_active
  from public.service_taxons
  where id = new.parent_id;

  if new.kind = 'subcategory' and parent_kind is distinct from 'category' then
    raise exception 'A Services Subcategory must belong to a Services Category.' using errcode = '22023';
  end if;
  if new.kind = 'service' and parent_kind is distinct from 'subcategory' then
    raise exception 'A Service must belong to a Services Subcategory.' using errcode = '22023';
  end if;
  if parent_active is distinct from true then
    raise exception 'The selected Services Taxonomy parent is inactive.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_service_taxonomy_hierarchy on public.service_taxons;
create trigger validate_service_taxonomy_hierarchy
before insert or update of kind, parent_id
on public.service_taxons
for each row execute function public.validate_service_taxonomy_hierarchy();

create or replace function public.protect_service_taxonomy_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind is distinct from old.kind then
    raise exception 'Services Taxonomy level is permanent and cannot be changed.' using errcode = '22023';
  end if;
  if new.parent_id is distinct from old.parent_id then
    raise exception 'Services Taxonomy parent relationship is permanent and cannot be changed.' using errcode = '22023';
  end if;
  if new.slug is distinct from old.slug then
    raise exception 'Services Taxonomy permanent key cannot be changed.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_service_taxonomy_identity on public.service_taxons;
create trigger protect_service_taxonomy_identity
before update on public.service_taxons
for each row execute function public.protect_service_taxonomy_identity();

create or replace function public.touch_service_taxonomy_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_service_taxonomy_updated_at on public.service_taxons;
create trigger touch_service_taxonomy_updated_at
before update on public.service_taxons
for each row execute function public.touch_service_taxonomy_updated_at();

-- Replace every incoming catalogue cascade with history-preserving restriction.
alter table public.service_attribute_mappings
  drop constraint if exists service_attribute_mappings_service_taxon_id_fkey;
alter table public.service_attribute_mappings
  add constraint service_attribute_mappings_service_taxon_id_fkey
  foreign key (service_taxon_id) references public.service_taxons(id) on delete restrict;

alter table public.service_attribute_values
  drop constraint if exists service_attribute_values_service_taxon_id_fkey;
alter table public.service_attribute_values
  add constraint service_attribute_values_service_taxon_id_fkey
  foreign key (service_taxon_id) references public.service_taxons(id) on delete restrict;

alter table public.service_product_group_attributes
  drop constraint if exists fk_service_pga_product_group,
  drop constraint if exists service_product_group_attributes_product_group_id_fkey;
alter table public.service_product_group_attributes
  add constraint service_product_group_attributes_product_group_id_fkey
  foreign key (product_group_id) references public.service_taxons(id) on delete restrict;

alter table public.service_subcategory_product_groups
  drop constraint if exists fk_service_scpg_product_group,
  drop constraint if exists fk_service_scpg_subcategory;
alter table public.service_subcategory_product_groups
  add constraint service_subcategory_product_groups_product_group_id_fkey
    foreign key (product_group_id) references public.service_taxons(id) on delete restrict,
  add constraint service_subcategory_product_groups_subcategory_id_fkey
    foreign key (subcategory_id) references public.service_taxons(id) on delete restrict;

alter table public.service_taxons enable row level security;

do $$
declare policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'service_taxons'
      and cmd <> 'SELECT'
  loop
    execute format('drop policy if exists %I on public.service_taxons', policy_row.policyname);
  end loop;
end;
$$;

revoke insert, update, delete, truncate, references, trigger
on table public.service_taxons
from anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
on table public.v_service_catalog
from anon, authenticated;

grant select on table public.service_taxons to anon, authenticated;
grant select on table public.v_service_catalog to anon, authenticated;

comment on column public.service_taxons.slug is
  'Permanent Services Taxonomy machine key. It cannot change after creation.';
comment on column public.service_taxons.parent_id is
  'Permanent hierarchy relationship: Category to Subcategory to Service.';
comment on column public.service_taxons.kind is
  'Permanent Services Taxonomy hierarchy level.';
comment on column public.service_taxons.description is
  'Human-reviewed Services description. AI may advise but never save automatically.';
comment on column public.service_taxons.source is
  'Catalogue provenance. Existing rows are marked legacy; new administrator rows use admin.';

do $$
begin
  if (select count(*) from public.service_taxons) <> 185
     or (select count(*) from public.v_service_catalog) <> 151 then
    raise exception 'Services Taxonomy migration stopped: post-migration catalogue counts changed.';
  end if;
end;
$$;

commit;
