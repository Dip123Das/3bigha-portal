/*
 * MOB-36: Authenticated cancellation of private agreement readiness.
 *
 * Because this workspace cannot itself execute an agreement, either bound
 * party may cancel it before any separately authorized legal execution.
 *
 * Cancellation affects only the readiness row and its private audit trail.
 * It does not cancel or decline the booking application, release inventory,
 * reverse or establish payment, delete party inputs, or change title or
 * ownership.
 */

create or replace function
  public.cancel_property_unit_booking_agreement_readiness (
    target_actor_user_id uuid,
    target_readiness_id uuid,
    target_reason text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  action_time timestamptz := clock_timestamp();

  target_unit_id uuid;
  normalized_reason text;

  unit_record record;

  application_record
    public.property_unit_booking_applications%rowtype;

  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;

  updated_readiness
    public.property_unit_booking_agreement_readiness%rowtype;

  actor_role_value text;
begin
  if target_actor_user_id is null then
    raise exception 'AGREEMENT_ACTOR_REQUIRED'
      using errcode = '22023';
  end if;

  if target_readiness_id is null then
    raise exception 'AGREEMENT_READINESS_ID_INVALID'
      using errcode = '22023';
  end if;

  normalized_reason := nullif(btrim(target_reason), '');

  if normalized_reason is not null
     and char_length(normalized_reason) > 500 then
    raise exception 'AGREEMENT_CANCELLATION_REASON_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Resolve only the immutable unit reference before locking.
   * Canonical lock order:
   *   unit -> application -> readiness.
   */
  select readiness.unit_id
  into target_unit_id
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = target_readiness_id;

  if target_unit_id is null then
    raise exception 'AGREEMENT_READINESS_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select
    unit.id,
    unit.project_id,
    unit.status,
    builder.owner_user_id
  into unit_record
  from public.builder_inventory_units unit
  join public.builder_projects project
    on project.id = unit.project_id
  join public.builder_profiles builder
    on builder.id = project.builder_profile_id
  where unit.id = target_unit_id
  for update of unit;

  if unit_record.id is null then
    raise exception 'UNIT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select application.*
  into application_record
  from public.property_unit_booking_applications application
  join public.property_unit_booking_agreement_readiness readiness
    on readiness.application_id = application.id
  where readiness.id = target_readiness_id
  for update of application;

  if application_record.id is null then
    raise exception 'APPLICATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select readiness.*
  into readiness_record
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = target_readiness_id
  for update;

  if readiness_record.id is null then
    raise exception 'AGREEMENT_READINESS_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if target_actor_user_id = readiness_record.buyer_user_id then
    actor_role_value := 'buyer';
  elsif target_actor_user_id = readiness_record.owner_user_id then
    actor_role_value := 'owner';
  else
    raise exception 'AGREEMENT_ACCESS_FORBIDDEN'
      using errcode = '42501';
  end if;

  if readiness_record.application_id <> application_record.id
     or readiness_record.unit_id <> unit_record.id
     or readiness_record.project_id <> unit_record.project_id
     or application_record.unit_id <> unit_record.id
     or application_record.project_id <> unit_record.project_id
     or readiness_record.hold_id <> application_record.hold_id
     or readiness_record.buyer_user_id
       <> application_record.buyer_user_id
     or readiness_record.owner_user_id
       <> application_record.owner_user_id
     or unit_record.owner_user_id
       <> application_record.owner_user_id then
    raise exception 'AGREEMENT_READINESS_BINDING_INVALID'
      using errcode = '42501';
  end if;

  if readiness_record.status = 'cancelled'
     and readiness_record.cancelled_at is not null then
    return jsonb_build_object(
      'readinessId', readiness_record.id,
      'applicationId', readiness_record.application_id,
      'unitId', readiness_record.unit_id,
      'projectId', readiness_record.project_id,
      'status', readiness_record.status,
      'cancelledAt', readiness_record.cancelled_at,
      'applicationUnchanged', true,
      'inventoryUnchanged', true,
      'replayed', true
    );
  end if;

  if readiness_record.status = 'expired' then
    raise exception 'AGREEMENT_READINESS_EXPIRED'
      using errcode = '55000';
  end if;

  /*
   * approved_for_execution is still only a readiness label in MOB-36.
   * No agreement execution authority exists, so either party retains the
   * ability to stop this private readiness process.
   */
  if readiness_record.status not in (
    'collecting_details',
    'ready_for_draft',
    'draft_generated',
    'parties_reviewing',
    'changes_requested',
    'approved_for_execution'
  ) then
    raise exception 'AGREEMENT_CANCELLATION_CONFLICT'
      using errcode = '55000';
  end if;

  update public.property_unit_booking_agreement_readiness
  set
    status = 'cancelled',
    cancelled_at = action_time,
    updated_at = action_time
  where id = readiness_record.id
    and status in (
      'collecting_details',
      'ready_for_draft',
      'draft_generated',
      'parties_reviewing',
      'changes_requested',
      'approved_for_execution'
    )
  returning * into updated_readiness;

  if updated_readiness.id is null then
    raise exception 'AGREEMENT_CANCELLATION_CONFLICT'
      using errcode = '40001';
  end if;

  insert into public.property_unit_booking_agreement_events (
    readiness_id,
    application_id,
    event_kind,
    actor_role,
    event_payload_json,
    occurred_at
  )
  values (
    updated_readiness.id,
    updated_readiness.application_id,
    'readiness_cancelled',
    actor_role_value,
    jsonb_build_object(
      'reason', normalized_reason,
      'readinessOnly', true,
      'applicationUnchanged', true,
      'inventoryUnchanged', true,
      'partyInputsRetainedPrivately', true,
      'confidentialDocumentsOpened', false,
      'agreementExecuted', false,
      'paymentChanged', false,
      'marksInventorySold', false,
      'transfersTitle', false,
      'transfersOwnership', false
    ),
    action_time
  );

  return jsonb_build_object(
    'readinessId', updated_readiness.id,
    'applicationId', updated_readiness.application_id,
    'unitId', updated_readiness.unit_id,
    'projectId', updated_readiness.project_id,
    'status', updated_readiness.status,
    'cancelledAt', updated_readiness.cancelled_at,
    'applicationUnchanged', true,
    'inventoryUnchanged', true,
    'replayed', false
  );
end;
$$;

revoke all on function
  public.cancel_property_unit_booking_agreement_readiness(
    uuid,
    uuid,
    text
  )
from public, anon, authenticated;

grant execute on function
  public.cancel_property_unit_booking_agreement_readiness(
    uuid,
    uuid,
    text
  )
to service_role;

comment on function
  public.cancel_property_unit_booking_agreement_readiness(
    uuid,
    uuid,
    text
  ) is
  'Allows either bound party to cancel only the private agreement-readiness workspace. It retains private audit data and does not change the accepted application, inventory reservation, payment, agreement execution, title or ownership.';
