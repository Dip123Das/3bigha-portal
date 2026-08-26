begin;

alter table if exists public.builder_inventory_units
  add column if not exists trusted_media_json jsonb
    not null
    default '[]'::jsonb,

  add column if not exists trusted_publication jsonb
    not null
    default '{}'::jsonb,

  add column if not exists trust_status text
    not null
    default 'pending';

comment on column
  public.builder_inventory_units.trusted_media_json
is
  'Canonical Trusted Listing Media evidence belonging specifically to this builder inventory unit. Project-level evidence must not satisfy this unit requirement.';

comment on column
  public.builder_inventory_units.trusted_publication
is
  'Latest server-compatible Trusted Publication readiness snapshot for the builder inventory unit.';

comment on column
  public.builder_inventory_units.trust_status
is
  'Unit trust lifecycle: pending, verified, failed or blocked.';

alter table if exists public.builder_inventory_units
  add constraint
    builder_inventory_units_trusted_media_json_array
  check (
    jsonb_typeof(trusted_media_json) = 'array'
  )
  not valid;

alter table if exists public.builder_inventory_units
  validate constraint
    builder_inventory_units_trusted_media_json_array;

alter table if exists public.builder_inventory_units
  add constraint
    builder_inventory_units_trust_status_check
  check (
    trust_status in (
      'pending',
      'verified',
      'failed',
      'blocked'
    )
  )
  not valid;

alter table if exists public.builder_inventory_units
  validate constraint
    builder_inventory_units_trust_status_check;

create index if not exists
  builder_inventory_units_trust_status_idx
on public.builder_inventory_units(
  project_id,
  trust_status
);



/*
 * Database defense in depth
 *
 * The application server performs the authoritative
 * Trusted Publication evaluation. This trigger blocks
 * obvious direct linkage bypasses at the database layer.
 */
create or replace function
  public.guard_builder_unit_listing_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit public.builder_inventory_units%rowtype;
  v_required integer;
  v_completed integer;
  v_ai_status text;
begin
  if
    new.source_kind is distinct from
      'builder_inventory'
    or new.unit_id is null
  then
    return new;
  end if;

  select *
  into v_unit
  from public.builder_inventory_units
  where id = new.unit_id;

  if not found then
    raise exception
      'Builder inventory unit does not exist.';
  end if;

  if
    new.project_id is null
    or new.project_id is distinct from
      v_unit.project_id
  then
    raise exception
      'Builder inventory unit and listing source project do not match.';
  end if;

  if
    jsonb_typeof(
      v_unit.trusted_media_json
    ) is distinct from 'array'
    or jsonb_array_length(
      v_unit.trusted_media_json
    ) < 1
  then
    raise exception
      'Builder inventory unit requires one trusted live capture before listing linkage.';
  end if;

  v_required :=
    coalesce(
      nullif(
        v_unit.trusted_publication
          ->> 'requiredCaptures',
        ''
      )::integer,
      1
    );

  v_completed :=
    coalesce(
      nullif(
        v_unit.trusted_publication
          ->> 'completedCaptures',
        ''
      )::integer,
      0
    );

  if
    v_required <> 1
    or v_completed < 1
  then
    raise exception
      'Builder inventory unit trusted capture requirement is incomplete.';
  end if;

  if
    coalesce(
      (
        v_unit.trusted_publication
          ->> 'gpsVerified'
      )::boolean,
      false
    ) is not true
  then
    raise exception
      'Builder inventory unit GPS verification is incomplete.';
  end if;

  if
    coalesce(
      (
        v_unit.trusted_publication
          ->> 'provenanceVerified'
      )::boolean,
      false
    ) is not true
  then
    raise exception
      'Builder inventory unit capture provenance is incomplete.';
  end if;

  if
    coalesce(
      (
        v_unit.trusted_publication
          ->> 'captureSessionCompleted'
      )::boolean,
      false
    ) is not true
  then
    raise exception
      'Builder inventory unit capture session is incomplete.';
  end if;

  v_ai_status :=
    lower(
      coalesce(
        v_unit.trusted_publication
          ->> 'aiVerificationStatus',
        'not_started'
      )
    );

  if
    v_ai_status in (
      'failed',
      'rejected',
      'mismatch'
    )
  then
    raise exception
      'Builder inventory unit AI media verification failed.';
  end if;

  if
    v_unit.trust_status is distinct from
      'verified'
  then
    raise exception
      'Builder inventory unit is not trust verified.';
  end if;

  return new;
end;
$$;

drop trigger if exists
  guard_builder_unit_listing_link_trigger
on public.property_listing_sources;

create trigger
  guard_builder_unit_listing_link_trigger
before insert or update of
  unit_id,
  project_id,
  source_kind
on public.property_listing_sources
for each row
execute function
  public.guard_builder_unit_listing_link();

commit;
