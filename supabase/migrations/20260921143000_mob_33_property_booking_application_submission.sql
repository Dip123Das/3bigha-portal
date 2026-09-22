begin;

/*
 * MOB-33 — Atomic conversion of a buyer-owned active hold into one private,
 * owner-reviewed booking application.
 *
 * Lock order is canonical: unit, hold, legal review. The unit remains
 * reserved. This function creates no payment, agreement, sale, title or
 * ownership transfer.
 */

create or replace function public.submit_property_unit_booking_application(
  target_buyer_user_id uuid,
  target_hold_id uuid,
  target_intent_version text,
  target_acknowledged_at timestamptz,
  target_buyer_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_time timestamptz := clock_timestamp();
  target_unit_id uuid;
  normalized_message text;
  unit_record record;
  hold_record public.property_unit_booking_holds%rowtype;
  legal_review record;
  created_application public.property_unit_booking_applications%rowtype;
begin
  if target_buyer_user_id is null then
    raise exception 'BUYER_REQUIRED' using errcode = '22023';
  end if;

  if target_hold_id is null then
    raise exception 'HOLD_ID_INVALID' using errcode = '22023';
  end if;

  if nullif(btrim(target_intent_version), '') is null
     or target_intent_version <> 'property-unit-booking-application-v1' then
    raise exception 'INTENT_VERSION_INVALID' using errcode = '22023';
  end if;

  if target_acknowledged_at is null
     or target_acknowledged_at > current_time + interval '1 minute'
     or target_acknowledged_at < current_time - interval '5 minutes' then
    raise exception 'ACKNOWLEDGEMENT_INVALID' using errcode = '22023';
  end if;

  normalized_message := nullif(btrim(target_buyer_message), '');

  if normalized_message is not null
     and char_length(normalized_message) > 1000 then
    raise exception 'BUYER_MESSAGE_INVALID' using errcode = '22023';
  end if;

  /*
   * Resolve the immutable unit reference first, then acquire the canonical
   * unit lock before locking the hold.
   */
  select hold_row.unit_id
  into target_unit_id
  from public.property_unit_booking_holds hold_row
  where hold_row.id = target_hold_id;

  if target_unit_id is null then
    raise exception 'HOLD_NOT_FOUND' using errcode = 'P0002';
  end if;

  select
    unit.id,
    unit.project_id,
    unit.status,
    unit.trust_status,
    project.status as project_status,
    project.is_active as project_is_active,
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
    raise exception 'UNIT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select hold_row.*
  into hold_record
  from public.property_unit_booking_holds hold_row
  where hold_row.id = target_hold_id
  for update;

  if hold_record.id is null then
    raise exception 'HOLD_NOT_FOUND' using errcode = 'P0002';
  end if;

  if hold_record.buyer_user_id <> target_buyer_user_id then
    raise exception 'HOLD_ACCESS_FORBIDDEN' using errcode = '42501';
  end if;

  if hold_record.unit_id <> unit_record.id
     or hold_record.project_id <> unit_record.project_id
     or hold_record.owner_user_id <> unit_record.owner_user_id then
    raise exception 'HOLD_TARGET_MISMATCH' using errcode = '42501';
  end if;

  if hold_record.status <> 'active' then
    raise exception 'HOLD_NOT_ACTIVE' using errcode = '55000';
  end if;

  if hold_record.expires_at <= current_time then
    raise exception 'HOLD_EXPIRED' using errcode = '55000';
  end if;

  if unit_record.project_status::text <> 'active'
     or unit_record.project_is_active is distinct from true then
    raise exception 'PROJECT_NOT_ACTIVE' using errcode = '22023';
  end if;

  if unit_record.trust_status::text <> 'verified' then
    raise exception 'UNIT_NOT_VERIFIED' using errcode = '22023';
  end if;

  if unit_record.status::text <> 'reserved' then
    raise exception 'UNIT_NOT_RESERVED' using errcode = '55000';
  end if;

  if not exists (
    select 1
    from public.v_property_unit_transaction_readiness readiness
    where readiness.unit_id = unit_record.id
      and readiness.transaction_data_ready = true
  ) then
    raise exception 'UNIT_NOT_TRANSACTION_READY' using errcode = '22023';
  end if;

  select review.*
  into legal_review
  from public.property_unit_legal_review_requests review
  where review.id = hold_record.legal_review_request_id
  for update;

  if legal_review.id is null then
    raise exception 'LEGAL_REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;

  if legal_review.buyer_user_id <> target_buyer_user_id
     or legal_review.unit_id <> unit_record.id
     or legal_review.project_id <> unit_record.project_id
     or legal_review.owner_user_id <> unit_record.owner_user_id then
    raise exception 'LEGAL_REVIEW_MISMATCH' using errcode = '42501';
  end if;

  if legal_review.status <> 'granted'
     or legal_review.revoked_at is not null
     or legal_review.expires_at is null
     or legal_review.expires_at <= current_time then
    raise exception 'LEGAL_REVIEW_NOT_GRANTED' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.property_unit_booking_applications application
    where application.unit_id = unit_record.id
      and application.status in ('submitted', 'accepted')
  ) then
    raise exception 'APPLICATION_ALREADY_ACTIVE' using errcode = '23505';
  end if;

  insert into public.property_unit_booking_applications (
    hold_id,
    unit_id,
    project_id,
    buyer_user_id,
    owner_user_id,
    legal_review_request_id,
    status,
    intent_version,
    buyer_acknowledged_at,
    buyer_message,
    submitted_at,
    decision_due_at
  ) values (
    hold_record.id,
    unit_record.id,
    unit_record.project_id,
    target_buyer_user_id,
    unit_record.owner_user_id,
    hold_record.legal_review_request_id,
    'submitted',
    target_intent_version,
    target_acknowledged_at,
    normalized_message,
    current_time,
    current_time + interval '48 hours'
  )
  returning * into created_application;

  update public.property_unit_booking_holds
  set
    status = 'converted',
    converted_at = current_time,
    released_at = current_time,
    conversion_reference_type = 'property_unit_booking_application',
    conversion_reference_id = created_application.id,
    updated_at = current_time
  where id = hold_record.id
    and status = 'active';

  if not found then
    raise exception 'HOLD_CONVERSION_CONFLICT' using errcode = '40001';
  end if;

  update public.builder_inventory_units
  set
    availability_note =
      'Reserved during authenticated owner review of a booking application.',
    updated_at = current_time
  where id = unit_record.id
    and status = 'reserved'::public.inventory_status;

  if not found then
    raise exception 'UNIT_STATUS_CONFLICT' using errcode = '40001';
  end if;

  insert into public.property_unit_booking_hold_events (
    hold_id,
    unit_id,
    project_id,
    buyer_user_id,
    owner_user_id,
    actor_user_id,
    event_kind,
    metadata
  ) values (
    hold_record.id,
    hold_record.unit_id,
    hold_record.project_id,
    hold_record.buyer_user_id,
    hold_record.owner_user_id,
    target_buyer_user_id,
    'hold_converted',
    jsonb_build_object(
      'conversionReferenceType', 'property_unit_booking_application',
      'conversionReferenceId', created_application.id
    )
  );

  insert into public.property_unit_booking_application_events (
    application_id,
    unit_id,
    project_id,
    actor_user_id,
    event_kind,
    metadata
  ) values (
    created_application.id,
    created_application.unit_id,
    created_application.project_id,
    target_buyer_user_id,
    'submitted',
    jsonb_build_object(
      'intentVersion', created_application.intent_version,
      'decisionDueAt', created_application.decision_due_at
    )
  );

  return jsonb_build_object(
    'id', created_application.id,
    'holdId', created_application.hold_id,
    'unitId', created_application.unit_id,
    'projectId', created_application.project_id,
    'legalReviewRequestId', created_application.legal_review_request_id,
    'status', created_application.status,
    'buyerMessage', created_application.buyer_message,
    'submittedAt', created_application.submitted_at,
    'decisionDueAt', created_application.decision_due_at,
    'ownerDecidedAt', created_application.owner_decided_at,
    'ownerDecisionNote', created_application.owner_decision_note,
    'acceptedUntil', created_application.accepted_until,
    'endedAt', created_application.ended_at
  );
end;
$$;

revoke all on function public.submit_property_unit_booking_application(
  uuid, uuid, text, timestamptz, text
) from public, anon, authenticated;

grant execute on function public.submit_property_unit_booking_application(
  uuid, uuid, text, timestamptz, text
) to service_role;

comment on function public.submit_property_unit_booking_application(
  uuid, uuid, text, timestamptz, text
) is
  'Atomically converts one buyer-owned active property-unit hold into a private owner-reviewed booking application while preserving reserved inventory. Creates no payment, agreement, sale, title or ownership transfer.';

commit;
