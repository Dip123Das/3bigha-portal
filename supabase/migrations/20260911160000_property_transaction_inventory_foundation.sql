begin;

/*
 * PBS-01A — Property transaction inventory foundation
 *
 * Compatibility rules:
 * - builder_inventory_units remains the canonical builder inventory table;
 * - existing unit ids, statuses, listing links and prices are preserved;
 * - incomplete legacy property mappings and pricing are not fabricated;
 * - holds and bookings are deliberately deferred to PBS-03;
 * - four boundaries are stored now but enforced by a later transaction gate.
 */

alter table public.builder_inventory_units
  add column if not exists plot_area_sqft numeric(18,4),
  add column if not exists built_up_sqft numeric(18,4),
  add column if not exists carpet_sqft numeric(18,4),
  add column if not exists super_built_up_sqft numeric(18,4),
  add column if not exists dimension_length_ft numeric(18,4),
  add column if not exists dimension_width_ft numeric(18,4),
  add column if not exists boundary_north text,
  add column if not exists boundary_south text,
  add column if not exists boundary_east text,
  add column if not exists boundary_west text,
  add column if not exists availability_note text;

comment on column public.builder_inventory_units.plot_area_sqft is
  'Declared plot or land area in square feet. Null means not provided; it must never be AI-invented.';
comment on column public.builder_inventory_units.built_up_sqft is
  'Declared built-up area in square feet. Null means not provided.';
comment on column public.builder_inventory_units.carpet_sqft is
  'Declared carpet area in square feet. Null means not provided.';
comment on column public.builder_inventory_units.super_built_up_sqft is
  'Declared super built-up area in square feet. Null means not provided.';
comment on column public.builder_inventory_units.dimension_length_ft is
  'Declared property or unit length in feet. Null means not provided.';
comment on column public.builder_inventory_units.dimension_width_ft is
  'Declared property or unit width in feet. Null means not provided.';
comment on column public.builder_inventory_units.boundary_north is
  'Human-confirmed northern boundary. Required by the transaction readiness gate.';
comment on column public.builder_inventory_units.boundary_south is
  'Human-confirmed southern boundary. Required by the transaction readiness gate.';
comment on column public.builder_inventory_units.boundary_east is
  'Human-confirmed eastern boundary. Required by the transaction readiness gate.';
comment on column public.builder_inventory_units.boundary_west is
  'Human-confirmed western boundary. Required by the transaction readiness gate.';
comment on column public.builder_inventory_units.availability_note is
  'Optional owner or administrator explanation of the canonical inventory status.';

alter table public.builder_inventory_units
  drop constraint if exists builder_inventory_units_unit_code_nonblank,
  add constraint builder_inventory_units_unit_code_nonblank
    check (unit_code is not null and btrim(unit_code) <> '') not valid,
  drop constraint if exists builder_inventory_units_area_values_positive,
  add constraint builder_inventory_units_area_values_positive
    check (
      (plot_area_sqft is null or plot_area_sqft > 0)
      and (built_up_sqft is null or built_up_sqft > 0)
      and (carpet_sqft is null or carpet_sqft > 0)
      and (super_built_up_sqft is null or super_built_up_sqft > 0)
      and (dimension_length_ft is null or dimension_length_ft > 0)
      and (dimension_width_ft is null or dimension_width_ft > 0)
    ) not valid;

alter table public.builder_inventory_units
  validate constraint builder_inventory_units_unit_code_nonblank;

alter table public.builder_inventory_units
  validate constraint builder_inventory_units_area_values_positive;

create unique index if not exists builder_inventory_units_project_normalized_unit_code_uk
  on public.builder_inventory_units (project_id, lower(btrim(unit_code)));

comment on index public.builder_inventory_units_project_normalized_unit_code_uk is
  'Prevents case- or whitespace-only duplicate unit codes inside one project.';

create table if not exists public.property_unit_status_events (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null
    references public.builder_inventory_units(id) on delete cascade,
  project_id uuid not null
    references public.builder_projects(id) on delete cascade,
  previous_status public.inventory_status,
  new_status public.inventory_status not null,
  event_kind text not null,
  change_channel text not null default 'system',
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  source_reference_type text,
  source_reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint property_unit_status_events_event_kind_check
    check (event_kind in ('inventory_initialized', 'status_changed', 'legacy_snapshot')),
  constraint property_unit_status_events_change_channel_check
    check (change_channel in ('system', 'online', 'offline', 'administrator', 'migration')),
  constraint property_unit_status_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.property_unit_status_events is
  'Append-only history of canonical property-unit availability changes, including online and declared offline events.';
comment on column public.property_unit_status_events.reason is
  'Human-readable reason. Booking and sale facts must be supported by their own domain records in later phases.';
comment on column public.property_unit_status_events.metadata is
  'Non-authoritative event context. Canonical identifiers and statuses remain typed columns.';

/* The composite event FK needs a matching unique key on the referenced table. */
create unique index if not exists builder_inventory_units_project_id_id_uk
  on public.builder_inventory_units (project_id, id);

-- Add the table-level FK after its supporting unique index exists.
alter table public.property_unit_status_events
  drop constraint if exists property_unit_status_events_project_unit_consistency_fk;

alter table public.property_unit_status_events
  add constraint property_unit_status_events_project_unit_consistency_fk
  foreign key (project_id, unit_id)
  references public.builder_inventory_units(project_id, id)
  on delete cascade;

create index if not exists property_unit_status_events_unit_created_idx
  on public.property_unit_status_events (unit_id, created_at desc);

create index if not exists property_unit_status_events_project_created_idx
  on public.property_unit_status_events (project_id, created_at desc);

alter table public.property_unit_status_events enable row level security;

drop policy if exists property_unit_status_events_owner_admin_select
  on public.property_unit_status_events;

create policy property_unit_status_events_owner_admin_select
on public.property_unit_status_events
for select
to authenticated
using (
  public.is_property_admin()
  or exists (
    select 1
    from public.builder_projects project
    join public.builder_profiles builder
      on builder.id = project.builder_profile_id
    where project.id = property_unit_status_events.project_id
      and builder.owner_user_id = auth.uid()
  )
);

revoke all on table public.property_unit_status_events from anon, authenticated;
grant select on table public.property_unit_status_events to authenticated;

create or replace function public.record_property_unit_status_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.property_unit_status_events (
      unit_id,
      project_id,
      previous_status,
      new_status,
      event_kind,
      change_channel,
      changed_by
    ) values (
      new.id,
      new.project_id,
      null,
      new.status,
      'inventory_initialized',
      'system',
      auth.uid()
    );
  elsif new.status is distinct from old.status then
    insert into public.property_unit_status_events (
      unit_id,
      project_id,
      previous_status,
      new_status,
      event_kind,
      change_channel,
      reason,
      changed_by
    ) values (
      new.id,
      new.project_id,
      old.status,
      new.status,
      'status_changed',
      'system',
      nullif(btrim(new.availability_note), ''),
      auth.uid()
    );
  end if;

  return new;
end;
$$;

revoke all on function public.record_property_unit_status_event() from public;

drop trigger if exists record_property_unit_status_event_trigger
  on public.builder_inventory_units;

create trigger record_property_unit_status_event_trigger
after insert or update of status
on public.builder_inventory_units
for each row
execute function public.record_property_unit_status_event();

insert into public.property_unit_status_events (
  unit_id,
  project_id,
  previous_status,
  new_status,
  event_kind,
  change_channel,
  reason,
  metadata,
  created_at
)
select
  unit.id,
  unit.project_id,
  null,
  unit.status,
  'legacy_snapshot',
  'migration',
  'PBS-01A preserved the pre-existing inventory status.',
  jsonb_build_object(
    'migration', '20260911160000_property_transaction_inventory_foundation',
    'legacy', true
  ),
  now()
from public.builder_inventory_units unit
where not exists (
  select 1
  from public.property_unit_status_events event
  where event.unit_id = unit.id
);

create or replace view public.v_property_unit_transaction_readiness
with (security_invoker = true)
as
select
  unit.id as unit_id,
  unit.project_id,
  unit.unit_code,
  unit.unit_kind,
  unit.status,
  unit.trust_status,
  unit.property_type_id,
  unit.property_subtype_id,
  unit.plot_area_sqft,
  unit.built_up_sqft,
  unit.carpet_sqft,
  unit.super_built_up_sqft,
  unit.boundary_north,
  unit.boundary_south,
  unit.boundary_east,
  unit.boundary_west,
  (unit.property_type_id is not null) as has_property_type,
  (unit.property_subtype_id is not null) as has_property_subtype,
  exists (
    select 1
    from public.builder_inventory_pricing pricing
    where pricing.unit_id = unit.id
      and pricing.price_total is not null
      and pricing.price_total > 0
  ) as has_positive_price,
  (
    nullif(btrim(unit.boundary_north), '') is not null
    and nullif(btrim(unit.boundary_south), '') is not null
    and nullif(btrim(unit.boundary_east), '') is not null
    and nullif(btrim(unit.boundary_west), '') is not null
  ) as has_four_boundaries,
  (
    coalesce(unit.plot_area_sqft, 0) > 0
    or coalesce(unit.built_up_sqft, 0) > 0
    or coalesce(unit.carpet_sqft, 0) > 0
    or coalesce(unit.super_built_up_sqft, 0) > 0
  ) as has_declared_area,
  (
    unit.property_type_id is not null
    and unit.property_subtype_id is not null
    and exists (
      select 1
      from public.builder_inventory_pricing pricing
      where pricing.unit_id = unit.id
        and pricing.price_total is not null
        and pricing.price_total > 0
    )
    and nullif(btrim(unit.boundary_north), '') is not null
    and nullif(btrim(unit.boundary_south), '') is not null
    and nullif(btrim(unit.boundary_east), '') is not null
    and nullif(btrim(unit.boundary_west), '') is not null
    and (
      coalesce(unit.plot_area_sqft, 0) > 0
      or coalesce(unit.built_up_sqft, 0) > 0
      or coalesce(unit.carpet_sqft, 0) > 0
      or coalesce(unit.super_built_up_sqft, 0) > 0
    )
    and unit.trust_status = 'verified'
  ) as transaction_data_ready
from public.builder_inventory_units unit;

comment on view public.v_property_unit_transaction_readiness is
  'Read-only readiness projection. False values identify missing seller data and must never be filled by AI inference.';

grant select on public.v_property_unit_transaction_readiness to authenticated;

commit;
