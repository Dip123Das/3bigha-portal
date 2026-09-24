/*
 * MOB-36: Authenticated agreement-party self-confirmation.
 *
 * The authenticated buyer or owner may confirm only their own previously
 * submitted private particulars. Confirmation records acknowledgement of
 * those structured particulars only.
 *
 * It does not confirm the property schedule, generate a draft, provide legal
 * advice, establish payment, execute an agreement, change inventory, or
 * transfer title or ownership.
 */

create or replace function
  public.confirm_property_unit_booking_agreement_party_input (
    target_actor_user_id uuid,
    target_readiness_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  action_time timestamptz := clock_timestamp();

  target_unit_id uuid;

  unit_record record;

  application_record
    public.property_unit_booking_applications%rowtype;

  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;

  party_record
    public.property_unit_booking_agreement_party_inputs%rowtype;

  updated_party
    public.property_unit_booking_agreement_party_inputs%rowtype;

  updated_readiness
    public.property_unit_booking_agreement_readiness%rowtype;

  expected_party_role text;
begin
  if target_actor_user_id is null then
    raise exception 'AGREEMENT_ACTOR_REQUIRED'
      using errcode = '22023';
  end if;

  if target_readiness_id is null then
    raise exception 'AGREEMENT_READINESS_ID_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Resolve only the immutable unit reference before locking.
   * Canonical lock order:
   *   unit -> application -> readiness -> party input.
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
    expected_party_role := 'buyer';
  elsif target_actor_user_id = readiness_record.owner_user_id then
    expected_party_role := 'owner';
  else
    raise exception 'AGREEMENT_ACCESS_FORBIDDEN'
      using errcode = '42501';
  end if;

  select party_input.*
  into party_record
  from public.property_unit_booking_agreement_party_inputs party_input
  where party_input.readiness_id = readiness_record.id
    and party_input.party_role = expected_party_role
  for update;

  if party_record.id is null then
    raise exception 'AGREEMENT_PARTY_INPUT_NOT_FOUND'
      using errcode = 'P0002';
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
       <> application_record.owner_user_id
     or party_record.party_user_id <> target_actor_user_id
     or party_record.party_role <> expected_party_role then
    raise exception 'AGREEMENT_PARTY_BINDING_INVALID'
      using errcode = '42501';
  end if;

  /*
   * Exact confirmation replay is idempotent. It may be acknowledged even
   * after the application window closes because no new state is created.
   */
  if party_record.status = 'confirmed'
     and party_record.confirmed_at is not null
     and (
       (
         expected_party_role = 'buyer'
         and readiness_record.buyer_details_confirmed_at
           is not null
       )
       or (
         expected_party_role = 'owner'
         and readiness_record.owner_details_confirmed_at
           is not null
       )
     ) then
    return jsonb_build_object(
      'readinessId', readiness_record.id,
      'applicationId', readiness_record.application_id,
      'partyRole', expected_party_role,
      'status', party_record.status,
      'confirmedAt', party_record.confirmed_at,
      'buyerDetailsConfirmed',
        readiness_record.buyer_details_confirmed_at
          is not null,
      'ownerDetailsConfirmed',
        readiness_record.owner_details_confirmed_at
          is not null,
      'propertyScheduleConfirmed',
        readiness_record.property_schedule_confirmed_at
          is not null,
      'readyForDraft',
        readiness_record.status = 'ready_for_draft',
      'replayed', true
    );
  end if;

  if application_record.status <> 'accepted' then
    raise exception 'APPLICATION_NOT_ACCEPTED'
      using errcode = '55000';
  end if;

  if application_record.accepted_until is null
     or application_record.accepted_until <= action_time
     or readiness_record.expires_at is null
     or readiness_record.expires_at <= action_time then
    raise exception 'APPLICATION_ACCEPTANCE_EXPIRED'
      using errcode = '55000';
  end if;

  if unit_record.status::text <> 'reserved' then
    raise exception 'UNIT_NOT_RESERVED'
      using errcode = '55000';
  end if;

  if readiness_record.status not in (
    'collecting_details',
    'changes_requested'
  ) then
    raise exception 'AGREEMENT_PARTY_CONFIRMATION_CONFLICT'
      using errcode = '55000';
  end if;

  if party_record.status <> 'submitted'
     or party_record.submitted_at is null
     or not party_record.consent_accepted
     or party_record.consent_accepted_at is null then
    raise exception 'AGREEMENT_PARTY_NOT_SUBMITTED'
      using errcode = '55000';
  end if;

  if nullif(btrim(party_record.legal_name), '') is null
     or nullif(btrim(party_record.address_line_1), '') is null
     or nullif(btrim(party_record.district), '') is null
     or nullif(btrim(party_record.state), '') is null
     or party_record.pincode !~ '^[0-9]{6}$'
     or party_record.identity_document_type is null
     or nullif(
       btrim(party_record.identity_masked_reference),
       ''
     ) is null then
    raise exception 'AGREEMENT_PARTY_DETAILS_INCOMPLETE'
      using errcode = '55000';
  end if;

  update public.property_unit_booking_agreement_party_inputs
  set
    status = 'confirmed',
    confirmed_at = action_time,
    updated_at = action_time
  where id = party_record.id
    and status = 'submitted'
  returning * into updated_party;

  if updated_party.id is null then
    raise exception 'AGREEMENT_PARTY_CONFIRMATION_CONFLICT'
      using errcode = '40001';
  end if;

  update public.property_unit_booking_agreement_readiness
  set
    buyer_details_confirmed_at = case
      when expected_party_role = 'buyer'
        then action_time
      else buyer_details_confirmed_at
    end,
    owner_details_confirmed_at = case
      when expected_party_role = 'owner'
        then action_time
      else owner_details_confirmed_at
    end,
    updated_at = action_time
  where id = readiness_record.id
    and status in (
      'collecting_details',
      'changes_requested'
    )
  returning * into updated_readiness;

  if updated_readiness.id is null then
    raise exception 'AGREEMENT_READINESS_UPDATE_CONFLICT'
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
    case
      when expected_party_role = 'buyer'
        then 'buyer_details_confirmed'
      else 'owner_details_confirmed'
    end,
    expected_party_role,
    jsonb_build_object(
      'inputVersion', updated_party.input_version,
      'selfConfirmation', true,
      'otherPartyDetailsExposed', false,
      'propertyScheduleConfirmed',
        updated_readiness.property_schedule_confirmed_at
          is not null,
      'readyForDraft', false,
      'confidentialDocumentOpened', false,
      'aiDraftGenerated', false,
      'agreementExecutionAllowed', false,
      'createsPayment', false,
      'marksInventorySold', false,
      'transfersTitle', false,
      'transfersOwnership', false
    ),
    action_time
  );

  return jsonb_build_object(
    'readinessId', updated_readiness.id,
    'applicationId', updated_readiness.application_id,
    'partyRole', expected_party_role,
    'status', updated_party.status,
    'confirmedAt', updated_party.confirmed_at,
    'buyerDetailsConfirmed',
      updated_readiness.buyer_details_confirmed_at is not null,
    'ownerDetailsConfirmed',
      updated_readiness.owner_details_confirmed_at is not null,
    'propertyScheduleConfirmed',
      updated_readiness.property_schedule_confirmed_at
        is not null,
    'readyForDraft', false,
    'replayed', false
  );
end;
$$;

revoke all on function
  public.confirm_property_unit_booking_agreement_party_input(
    uuid,
    uuid
  )
from public, anon, authenticated;

grant execute on function
  public.confirm_property_unit_booking_agreement_party_input(
    uuid,
    uuid
  )
to service_role;

comment on function
  public.confirm_property_unit_booking_agreement_party_input(
    uuid,
    uuid
  ) is
  'Allows an authenticated buyer or owner to confirm only their own previously submitted, masked agreement particulars. It does not expose the other party, confirm the property schedule, generate or execute an agreement, establish payment, alter inventory, or transfer title or ownership.';
