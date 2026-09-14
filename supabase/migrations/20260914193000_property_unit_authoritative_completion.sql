begin;

create table if not exists public.property_unit_completion_events (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.builder_inventory_units(id) on delete cascade,
  project_id uuid not null references public.builder_projects(id) on delete cascade,
  completion_mode text not null check (completion_mode in ('draft', 'verify')),
  resulting_trust_status text not null check (resulting_trust_status in ('pending', 'verified')),
  changed_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint property_unit_completion_project_unit_fk
    foreign key (project_id, unit_id)
    references public.builder_inventory_units(project_id, id)
    on delete cascade
);

create index if not exists property_unit_completion_events_unit_created_idx
  on public.property_unit_completion_events(unit_id, created_at desc);

alter table public.property_unit_completion_events enable row level security;
revoke all on public.property_unit_completion_events from public, anon, authenticated;
grant select, insert on public.property_unit_completion_events to service_role;

create or replace function public.complete_builder_inventory_unit_authoritative(
  target_owner_user_id uuid,
  target_unit_id uuid,
  target_unit jsonb,
  target_amenity_ids uuid[] default '{}'::uuid[],
  target_completion_mode text default 'draft'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owned_unit public.builder_inventory_units%rowtype;
  normalized_mode text := lower(btrim(coalesce(target_completion_mode, 'draft')));
  requested_trust_status text := lower(btrim(coalesce(target_unit->>'trustStatus', 'pending')));
  requested_type_id uuid := nullif(target_unit->>'propertyTypeId', '')::uuid;
  requested_subtype_id uuid := nullif(target_unit->>'propertySubtypeId', '')::uuid;
  requested_price numeric := nullif(target_unit->>'priceTotal', '')::numeric;
begin
  if target_owner_user_id is null or target_unit_id is null or jsonb_typeof(target_unit) <> 'object' then
    raise exception 'Owner, unit and unit details are required.' using errcode = '22023';
  end if;
  if normalized_mode not in ('draft', 'verify') then
    raise exception 'Completion mode must be draft or verify.' using errcode = '22023';
  end if;
  if requested_trust_status not in ('pending', 'verified') then
    raise exception 'Trust status must be pending or verified.' using errcode = '22023';
  end if;

  select unit.* into owned_unit
  from public.builder_inventory_units unit
  join public.builder_projects project on project.id = unit.project_id
  join public.builder_profiles builder on builder.id = project.builder_profile_id
  join public.business_profiles business on business.user_id = builder.owner_user_id
  where unit.id = target_unit_id
    and builder.owner_user_id = target_owner_user_id
    and business.is_complete = true
  for update of unit;

  if owned_unit.id is null then
    raise exception 'Unit ownership or completed business registration was not verified.' using errcode = '42501';
  end if;
  if nullif(btrim(target_unit->>'unitCode'), '') is null then
    raise exception 'Unit code is required.' using errcode = '22023';
  end if;
  if requested_subtype_id is not null and not exists (
    select 1 from public.property_subtypes subtype
    where subtype.id = requested_subtype_id and subtype.type_id = requested_type_id and subtype.is_active = true
  ) then
    raise exception 'Property subtype does not belong to the selected active property type.' using errcode = '22023';
  end if;
  if cardinality(coalesce(target_amenity_ids, '{}'::uuid[])) <> (
    select count(distinct amenity.id) from public.amenities_master amenity
    where amenity.id = any(coalesce(target_amenity_ids, '{}'::uuid[])) and amenity.is_active = true
  ) then
    raise exception 'One or more selected amenities are invalid or inactive.' using errcode = '22023';
  end if;

  if normalized_mode = 'verify' and (
    requested_type_id is null or requested_subtype_id is null or requested_price is null or requested_price <= 0
    or nullif(btrim(target_unit->>'boundaryNorth'), '') is null
    or nullif(btrim(target_unit->>'boundarySouth'), '') is null
    or nullif(btrim(target_unit->>'boundaryEast'), '') is null
    or nullif(btrim(target_unit->>'boundaryWest'), '') is null
    or coalesce(nullif(target_unit->>'plotAreaSqft', '')::numeric, 0) <= 0
       and coalesce(nullif(target_unit->>'builtUpSqft', '')::numeric, 0) <= 0
       and coalesce(nullif(target_unit->>'carpetSqft', '')::numeric, 0) <= 0
       and coalesce(nullif(target_unit->>'superBuiltUpSqft', '')::numeric, 0) <= 0
    or requested_trust_status <> 'verified'
  ) then
    raise exception 'Verification requires taxonomy, positive price and area, four boundaries, and verified exact-unit media.' using errcode = '22023';
  end if;

  update public.builder_inventory_units set
    unit_code = btrim(target_unit->>'unitCode'),
    title = nullif(btrim(target_unit->>'title'), ''),
    property_type_id = requested_type_id,
    property_subtype_id = requested_subtype_id,
    tower = nullif(btrim(target_unit->>'tower'), ''),
    block = nullif(btrim(target_unit->>'block'), ''),
    floor_no = nullif(target_unit->>'floorNo', '')::integer,
    unit_no = nullif(btrim(target_unit->>'unitNo'), ''),
    facing = nullif(btrim(target_unit->>'facing'), ''),
    plot_area_sqft = nullif(target_unit->>'plotAreaSqft', '')::numeric,
    built_up_sqft = nullif(target_unit->>'builtUpSqft', '')::numeric,
    carpet_sqft = nullif(target_unit->>'carpetSqft', '')::numeric,
    super_built_up_sqft = nullif(target_unit->>'superBuiltUpSqft', '')::numeric,
    dimension_length_ft = nullif(target_unit->>'dimensionLengthFt', '')::numeric,
    dimension_width_ft = nullif(target_unit->>'dimensionWidthFt', '')::numeric,
    boundary_north = nullif(btrim(target_unit->>'boundaryNorth'), ''),
    boundary_south = nullif(btrim(target_unit->>'boundarySouth'), ''),
    boundary_east = nullif(btrim(target_unit->>'boundaryEast'), ''),
    boundary_west = nullif(btrim(target_unit->>'boundaryWest'), ''),
    availability_note = nullif(btrim(target_unit->>'availabilityNote'), ''),
    trusted_media_json = coalesce(target_unit->'trustedMediaJson', '[]'::jsonb),
    trusted_publication = coalesce(target_unit->'trustedPublication', '{}'::jsonb),
    trust_status = requested_trust_status,
    updated_at = now()
  where id = target_unit_id;

  if requested_price is null then
    delete from public.builder_inventory_pricing where unit_id = target_unit_id;
  else
    insert into public.builder_inventory_pricing(unit_id, pricing_kind, price_total)
    values (target_unit_id, 'total', requested_price)
    on conflict (unit_id) do update set price_total = excluded.price_total, pricing_kind = excluded.pricing_kind, updated_at = now();
  end if;

  delete from public.builder_inventory_unit_amenities where unit_id = target_unit_id;
  insert into public.builder_inventory_unit_amenities(unit_id, amenity_id)
  select target_unit_id, amenity.id from public.amenities_master amenity
  where amenity.id = any(coalesce(target_amenity_ids, '{}'::uuid[]) ) and amenity.is_active = true;

  insert into public.property_unit_completion_events(unit_id, project_id, completion_mode, resulting_trust_status, changed_by, metadata)
  values (target_unit_id, owned_unit.project_id, normalized_mode, requested_trust_status, target_owner_user_id,
    jsonb_build_object('priceProvided', requested_price is not null, 'amenityCount', cardinality(coalesce(target_amenity_ids, '{}'::uuid[]))));

  return jsonb_build_object('unitId', target_unit_id, 'projectId', owned_unit.project_id,
    'completionMode', normalized_mode, 'trustStatus', requested_trust_status);
end;
$$;

revoke all on function public.complete_builder_inventory_unit_authoritative(uuid, uuid, jsonb, uuid[], text)
  from public, anon, authenticated;
grant execute on function public.complete_builder_inventory_unit_authoritative(uuid, uuid, jsonb, uuid[], text)
  to service_role;

commit;
