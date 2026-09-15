begin;

alter table public.builder_inventory_units
  add column if not exists land_vacancy_status text,
  add column if not exists existing_structure_type text,
  add column if not exists boundary_demarcation_type text;

alter table public.builder_inventory_units
  drop constraint if exists builder_units_land_vacancy_status_check,
  add constraint builder_units_land_vacancy_status_check check (
    land_vacancy_status is null or land_vacancy_status in ('fully_vacant', 'not_fully_vacant')
  ),
  drop constraint if exists builder_units_existing_structure_type_check,
  add constraint builder_units_existing_structure_type_check check (
    existing_structure_type is null or existing_structure_type in (
      'none', 'dilapidated_pucca', 'dilapidated_kachha', 'usable_pucca',
      'usable_kachha', 'temporary_shed', 'mixed', 'other'
    )
  ),
  drop constraint if exists builder_units_boundary_demarcation_type_check,
  add constraint builder_units_boundary_demarcation_type_check check (
    boundary_demarcation_type is null or boundary_demarcation_type in (
      'full_boundary_wall', 'partial_boundary_wall', 'guard_wall',
      'corner_pillars', 'fencing', 'none', 'other'
    )
  ),
  drop constraint if exists builder_units_land_fields_only_for_plots,
  add constraint builder_units_land_fields_only_for_plots check (
    unit_kind = 'plot' or (
      land_vacancy_status is null and existing_structure_type is null
      and boundary_demarcation_type is null
    )
  );

comment on column public.builder_inventory_units.land_vacancy_status is
  'Builder-declared physical vacancy of a land/plot unit; not an AI inference.';
comment on column public.builder_inventory_units.existing_structure_type is
  'Builder-declared structure currently present on a non-fully-vacant plot.';
comment on column public.builder_inventory_units.boundary_demarcation_type is
  'Physical boundary marking for the selected land unit, separate from four legal boundary descriptions.';

do $$
begin
  if to_regprocedure('public.create_builder_inventory_units_authoritative_pbs01_core(uuid,uuid,jsonb,uuid[])') is null then
    alter function public.create_builder_inventory_units_authoritative(uuid, uuid, jsonb, uuid[])
      rename to create_builder_inventory_units_authoritative_pbs01_core;
  end if;
end;
$$;

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
  core_result jsonb;
  target_unit jsonb;
  item_index integer := 0;
  created_unit_id uuid;
  normalized_kind text;
begin
  core_result := public.create_builder_inventory_units_authoritative_pbs01_core(
    target_owner_user_id, target_project_id, target_units, target_amenity_ids
  );

  for target_unit in select value from jsonb_array_elements(target_units)
  loop
    created_unit_id := (core_result->'createdUnitIds'->>item_index)::uuid;
    normalized_kind := lower(btrim(coalesce(target_unit->>'unitKind', '')));

    update public.builder_inventory_units set
      land_vacancy_status = case when normalized_kind = 'plot' then nullif(target_unit->>'landVacancyStatus', '') else null end,
      existing_structure_type = case when normalized_kind = 'plot' and target_unit->>'landVacancyStatus' = 'not_fully_vacant' then nullif(target_unit->>'existingStructureType', '') else null end,
      boundary_demarcation_type = case when normalized_kind = 'plot' then nullif(target_unit->>'boundaryDemarcationType', '') else null end
    where id = created_unit_id;

    item_index := item_index + 1;
  end loop;

  return core_result;
end;
$$;

revoke all on function public.create_builder_inventory_units_authoritative(uuid, uuid, jsonb, uuid[])
  from public, anon, authenticated;
grant execute on function public.create_builder_inventory_units_authoritative(uuid, uuid, jsonb, uuid[])
  to service_role;
revoke all on function public.create_builder_inventory_units_authoritative_pbs01_core(uuid, uuid, jsonb, uuid[])
  from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public.complete_builder_inventory_unit_authoritative_pbs02c_core(uuid,uuid,jsonb,uuid[],text)') is null then
    alter function public.complete_builder_inventory_unit_authoritative(uuid, uuid, jsonb, uuid[], text)
      rename to complete_builder_inventory_unit_authoritative_pbs02c_core;
  end if;
end;
$$;

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
  core_result jsonb;
  stored_kind public.unit_kind;
begin
  core_result := public.complete_builder_inventory_unit_authoritative_pbs02c_core(
    target_owner_user_id, target_unit_id, target_unit, target_amenity_ids, target_completion_mode
  );
  select unit_kind into stored_kind from public.builder_inventory_units where id = target_unit_id;
  update public.builder_inventory_units set
    land_vacancy_status = case when stored_kind = 'plot' then nullif(target_unit->>'landVacancyStatus', '') else null end,
    existing_structure_type = case when stored_kind = 'plot' and target_unit->>'landVacancyStatus' = 'not_fully_vacant' then nullif(target_unit->>'existingStructureType', '') else null end,
    boundary_demarcation_type = case when stored_kind = 'plot' then nullif(target_unit->>'boundaryDemarcationType', '') else null end
  where id = target_unit_id;
  return core_result;
end;
$$;

revoke all on function public.complete_builder_inventory_unit_authoritative(uuid, uuid, jsonb, uuid[], text)
  from public, anon, authenticated;
grant execute on function public.complete_builder_inventory_unit_authoritative(uuid, uuid, jsonb, uuid[], text)
  to service_role;
revoke all on function public.complete_builder_inventory_unit_authoritative_pbs02c_core(uuid, uuid, jsonb, uuid[], text)
  from public, anon, authenticated;

commit;
