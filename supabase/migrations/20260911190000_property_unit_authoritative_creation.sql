begin;

alter table public.builder_inventory_units
  add column if not exists catalog_id uuid,
  add column if not exists bedroom_count integer,
  add column if not exists structure_floors integer;

alter table public.builder_inventory_units
  drop constraint if exists builder_inventory_units_bedroom_count_positive,
  add constraint builder_inventory_units_bedroom_count_positive
    check (bedroom_count is null or bedroom_count > 0) not valid,
  drop constraint if exists builder_inventory_units_structure_floors_positive,
  add constraint builder_inventory_units_structure_floors_positive
    check (structure_floors is null or structure_floors > 0) not valid;

alter table public.builder_inventory_units
  validate constraint builder_inventory_units_bedroom_count_positive;
alter table public.builder_inventory_units
  validate constraint builder_inventory_units_structure_floors_positive;

create unique index if not exists builder_project_catalogs_project_id_id_uk
  on public.builder_project_catalogs (project_id, id);

alter table public.builder_inventory_units
  drop constraint if exists builder_inventory_units_project_catalog_fk;
alter table public.builder_inventory_units
  add constraint builder_inventory_units_project_catalog_fk
  foreign key (project_id, catalog_id)
  references public.builder_project_catalogs(project_id, id)
  on delete restrict;

comment on column public.builder_inventory_units.catalog_id is
  'Optional project catalogue classification, constrained to the same project.';
comment on column public.builder_inventory_units.bedroom_count is
  'Declared bedroom count for applicable residential units.';
comment on column public.builder_inventory_units.structure_floors is
  'Declared total floor count for an applicable house, villa or duplex.';

create or replace function public.create_builder_inventory_units_authoritative(
  target_owner_user_id uuid,
  target_project_id uuid,
  target_units jsonb,
  target_amenity_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_builder_profile_id uuid;
  target_unit jsonb;
  created_unit_id uuid;
  created_ids uuid[] := '{}'::uuid[];
  requested_count integer;
  normalized_kind text;
  requested_trust_status text;
begin
  if target_owner_user_id is null or target_project_id is null then
    raise exception 'Owner and project are required.' using errcode = '22023';
  end if;

  if jsonb_typeof(target_units) <> 'array' then
    raise exception 'Units must be a JSON array.' using errcode = '22023';
  end if;

  requested_count := jsonb_array_length(target_units);
  if requested_count < 1 or requested_count > 200 then
    raise exception 'Between 1 and 200 units may be created at once.' using errcode = '22023';
  end if;

  select project.builder_profile_id
  into target_builder_profile_id
  from public.builder_projects project
  join public.builder_profiles builder
    on builder.id = project.builder_profile_id
  join public.business_profiles business
    on business.user_id = builder.owner_user_id
  where project.id = target_project_id
    and builder.owner_user_id = target_owner_user_id
    and business.is_complete = true
  for update of project;

  if target_builder_profile_id is null then
    raise exception 'Project ownership or completed business registration was not verified.'
      using errcode = '42501';
  end if;

  if cardinality(coalesce(target_amenity_ids, '{}'::uuid[])) <> (
    select count(distinct amenity.id)
    from public.amenities_master amenity
    where amenity.id = any(coalesce(target_amenity_ids, '{}'::uuid[]))
      and amenity.is_active = true
  ) then
    raise exception 'One or more selected amenities are invalid or inactive.'
      using errcode = '22023';
  end if;

  for target_unit in
    select value from jsonb_array_elements(target_units)
  loop
    if jsonb_typeof(target_unit) <> 'object' then
      raise exception 'Each unit must be a JSON object.' using errcode = '22023';
    end if;

    if nullif(btrim(target_unit->>'unitCode'), '') is null then
      raise exception 'Every unit requires a unit code.' using errcode = '22023';
    end if;

    if requested_count = 1 and (
      nullif(btrim(target_unit->>'boundaryNorth'), '') is null
      or nullif(btrim(target_unit->>'boundarySouth'), '') is null
      or nullif(btrim(target_unit->>'boundaryEast'), '') is null
      or nullif(btrim(target_unit->>'boundaryWest'), '') is null
    ) then
      raise exception 'North, South, East and West boundaries are mandatory for an individual unit.'
        using errcode = '22023';
    end if;

    normalized_kind := lower(btrim(coalesce(target_unit->>'unitKind', '')));
    if normalized_kind not in ('flat', 'plot', 'shop', 'office', 'house', 'villa', 'warehouse', 'other') then
      raise exception 'Unsupported unit kind: %', normalized_kind using errcode = '22023';
    end if;

    requested_trust_status := lower(btrim(coalesce(target_unit->>'trustStatus', 'pending')));
    if requested_trust_status not in ('pending', 'verified') then
      raise exception 'Creation may use only pending or verified trust status.' using errcode = '22023';
    end if;

    insert into public.builder_inventory_units (
      project_id, catalog_id, unit_code, title, property_type_id,
      property_subtype_id, unit_kind, tower, block, floor_no, unit_no,
      facing, status, investment_plan_master_id, trusted_media_json,
      trusted_publication, trust_status, plot_area_sqft, built_up_sqft,
      carpet_sqft, super_built_up_sqft, dimension_length_ft,
      dimension_width_ft, boundary_north, boundary_south, boundary_east,
      boundary_west, availability_note, bedroom_count, structure_floors
    ) values (
      target_project_id,
      nullif(target_unit->>'catalogId', '')::uuid,
      btrim(target_unit->>'unitCode'),
      nullif(btrim(target_unit->>'title'), ''),
      nullif(target_unit->>'propertyTypeId', '')::uuid,
      nullif(target_unit->>'propertySubtypeId', '')::uuid,
      normalized_kind::public.unit_kind,
      nullif(btrim(target_unit->>'tower'), ''),
      nullif(btrim(target_unit->>'block'), ''),
      nullif(target_unit->>'floorNo', '')::integer,
      nullif(btrim(target_unit->>'unitNo'), ''),
      nullif(btrim(target_unit->>'facing'), ''),
      'available'::public.inventory_status,
      nullif(target_unit->>'investmentPlanMasterId', '')::uuid,
      coalesce(target_unit->'trustedMediaJson', '[]'::jsonb),
      coalesce(target_unit->'trustedPublication', '{}'::jsonb),
      requested_trust_status,
      nullif(target_unit->>'plotAreaSqft', '')::numeric,
      nullif(target_unit->>'builtUpSqft', '')::numeric,
      nullif(target_unit->>'carpetSqft', '')::numeric,
      nullif(target_unit->>'superBuiltUpSqft', '')::numeric,
      nullif(target_unit->>'dimensionLengthFt', '')::numeric,
      nullif(target_unit->>'dimensionWidthFt', '')::numeric,
      nullif(btrim(target_unit->>'boundaryNorth'), ''),
      nullif(btrim(target_unit->>'boundarySouth'), ''),
      nullif(btrim(target_unit->>'boundaryEast'), ''),
      nullif(btrim(target_unit->>'boundaryWest'), ''),
      nullif(btrim(target_unit->>'availabilityNote'), ''),
      nullif(target_unit->>'bedroomCount', '')::integer,
      nullif(target_unit->>'structureFloors', '')::integer
    )
    returning id into created_unit_id;

    created_ids := array_append(created_ids, created_unit_id);

    if nullif(target_unit->>'priceTotal', '') is not null then
      insert into public.builder_inventory_pricing (
        unit_id, pricing_kind, price_total
      ) values (
        created_unit_id,
        coalesce(nullif(btrim(target_unit->>'pricingKind'), ''), 'total'),
        (target_unit->>'priceTotal')::numeric
      );
    end if;

    insert into public.builder_inventory_unit_amenities (unit_id, amenity_id)
    select created_unit_id, amenity.id
    from public.amenities_master amenity
    where amenity.id = any(coalesce(target_amenity_ids, '{}'::uuid[]))
      and amenity.is_active = true
    on conflict do nothing;
  end loop;

  return jsonb_build_object(
    'projectId', target_project_id,
    'createdUnitIds', to_jsonb(created_ids),
    'createdCount', cardinality(created_ids)
  );
end;
$$;

revoke all on function public.create_builder_inventory_units_authoritative(uuid, uuid, jsonb, uuid[])
  from public, anon, authenticated;
grant execute on function public.create_builder_inventory_units_authoritative(uuid, uuid, jsonb, uuid[])
  to service_role;

commit;
