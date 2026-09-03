begin;

-- Rental Mapping production baseline verified on 2026-09-03:
--   rental product groups:               83
--   active rental product groups:        83
--   rental attributes:                    0
--   active rental attributes:             0
--   product-group attribute mappings:     0
--   invalid references:                   0
--   duplicate mapping pairs:              0
--
-- This migration governs Rental Mapping only.
-- It preserves Rental Taxonomy, Attributes, Values and listing history.

alter table public.rental_product_group_attributes
  drop constraint if exists
  rental_product_group_attributes_sort_order_check;

alter table public.rental_product_group_attributes
  add constraint
  rental_product_group_attributes_sort_order_check
  check (
    sort_order is null
    or sort_order between 0 and 1000000
  );

create unique index if not exists
  rental_product_group_attributes_pair_uidx
on public.rental_product_group_attributes (
  product_group_id,
  attribute_id
);

alter table public.rental_product_group_attributes
  drop constraint if exists
  rental_product_group_attributes_product_group_id_fkey;

alter table public.rental_product_group_attributes
  add constraint
  rental_product_group_attributes_product_group_id_fkey
  foreign key (product_group_id)
  references public.rental_taxons(id)
  on delete restrict;

alter table public.rental_product_group_attributes
  drop constraint if exists
  rental_product_group_attributes_attribute_id_fkey;

alter table public.rental_product_group_attributes
  add constraint
  rental_product_group_attributes_attribute_id_fkey
  foreign key (attribute_id)
  references public.rental_attributes(id)
  on delete restrict;

create or replace function
public.validate_rental_product_group_attribute()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_kind text;
begin
  select kind
  into parent_kind
  from public.rental_taxons
  where id = new.product_group_id;

  if parent_kind is null then
    raise exception
      'Rental product group does not exist.'
      using errcode = '23503';
  end if;

  if parent_kind <> 'product_group' then
    raise exception
      'Rental attributes may be mapped only to Rental Product Groups.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.rental_attributes
    where id = new.attribute_id
  ) then
    raise exception
      'Rental attribute does not exist.'
      using errcode = '23503';
  end if;

  return new;
end;
$$;

drop trigger if exists
  validate_rental_product_group_attribute
on public.rental_product_group_attributes;

create trigger
  validate_rental_product_group_attribute
before insert or update
on public.rental_product_group_attributes
for each row
execute function
  public.validate_rental_product_group_attribute();

create or replace function
public.protect_rental_product_group_attribute_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.product_group_id
     is distinct from old.product_group_id then
    raise exception
      'Rental Mapping Product Group cannot be changed after creation.'
      using errcode = '22023';
  end if;

  if new.attribute_id
     is distinct from old.attribute_id then
    raise exception
      'Rental Mapping Attribute cannot be changed after creation.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists
  protect_rental_product_group_attribute_identity
on public.rental_product_group_attributes;

create trigger
  protect_rental_product_group_attribute_identity
before update
on public.rental_product_group_attributes
for each row
execute function
  public.protect_rental_product_group_attribute_identity();

create or replace function
public.touch_rental_product_group_attribute_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
  touch_rental_product_group_attributes_updated_at
on public.rental_product_group_attributes;

create trigger
  touch_rental_product_group_attributes_updated_at
before update
on public.rental_product_group_attributes
for each row
execute function
  public.touch_rental_product_group_attribute_updated_at();

alter table public.rental_product_group_attributes
  enable row level security;

drop policy if exists rentals_write_pg_attr
  on public.rental_product_group_attributes;

drop policy if exists rentals_write_pg_attr_map
  on public.rental_product_group_attributes;

drop policy if exists
  rental_product_group_attributes_admin_all
  on public.rental_product_group_attributes;

drop policy if exists
  rental_product_group_attributes_authenticated_write
  on public.rental_product_group_attributes;

drop policy if exists
  rental_product_group_attributes_insert
  on public.rental_product_group_attributes;

drop policy if exists
  rental_product_group_attributes_update
  on public.rental_product_group_attributes;

drop policy if exists
  rental_product_group_attributes_delete
  on public.rental_product_group_attributes;

revoke insert, update, delete, truncate, references, trigger
on table public.rental_product_group_attributes
from anon, authenticated;

grant select
on table public.rental_product_group_attributes
to anon, authenticated;

comment on table public.rental_product_group_attributes is
  'Administrator-controlled mapping of reusable Rental Attributes to Rental Product Groups. Historical mappings are deactivated rather than deleted.';

comment on column
public.rental_product_group_attributes.product_group_id is
  'Permanent parent Rental Product Group relationship. It cannot be changed after creation.';

comment on column
public.rental_product_group_attributes.attribute_id is
  'Permanent Rental Attribute relationship. It cannot be changed after creation.';

comment on column
public.rental_product_group_attributes.is_required is
  'Whether the mapped Rental Attribute is required for listings in this Product Group.';

comment on column
public.rental_product_group_attributes.is_active is
  'Lifecycle status. Inactive mappings remain preserved for administrative and historical use.';

commit;
