begin;

/*
 * MOB-33 — Buyer cancellation and automatic application expiry.
 *
 * Both authorities use unit-first locking and release only inventory that is
 * still reserved. They never overwrite sold or otherwise terminal inventory.
 * They create no payment, agreement, title or ownership transfer.
 */

create or replace function public.cancel_property_unit_booking_application(
  target_buyer_user_id uuid,
  target_application_id uuid,
  target_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_time timestamptz := clock_timestamp();
  target_unit_id uuid;
  normalized_reason text;
  unit_record record;
  application_record public.property_unit_booking_applications%rowtype;
  updated_application public.property_unit_booking_applications%rowtype;
begin
  if target_buyer_user_id is null then
    raise exception 'BUYER_REQUIRED' using errcode = '22023';
  end if;

  if target_application_id is null then
    raise exception 'APPLICATION_ID_INVALID' using errcode = '22023';
  end if;

  normalized_reason := nullif(btrim(target_reason), '');

  if normalized_reason is not null
     and char_length(normalized_reason) > 500 then
    raise exception 'CANCELLATION_REASON_INVALID' using errcode = '22023';
  end if;

  select application.unit_id
  into target_unit_id
  from public.property_unit_booking_applications application
  where application.id = target_application_id;

  if target_unit_id is null then
    raise exception 'APPLICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  select
    unit.id,
    unit.project_id,
    unit.status
  into unit_record
  from public.builder_inventory_units unit
  where unit.id = target_unit_id
  for update;

  if unit_record.id is null then
    raise exception 'UNIT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select application.*
  into application_record
  from public.property_unit_booking_applications application
  where application.id = target_application_id
  for update;

  if application_record.id is null then
    raise exception 'APPLICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if application_record.buyer_user_id <> target_buyer_user_id then
    raise exception 'APPLICATION_ACCESS_FORBIDDEN' using errcode = '42501';
  end if;

  if application_record.unit_id <> unit_record.id
     or application_record.project_id <> unit_record.project_id then
    raise exception 'APPLICATION_TARGET_MISMATCH' using errcode = '42501';
  end if;

  if application_record.status not in ('submitted', 'accepted') then
    raise exception 'APPLICATION_NOT_ACTIVE' using errcode = '55000';
  end if;

  update public.property_unit_booking_applications
  set
    status = 'cancelled',
    accepted_until = null,
    cancelled_at = current_time,
    ended_at = current_time,
    updated_at = current_time
  where id = application_record.id
    and status in ('submitted', 'accepted')
  returning * into updated_application;

  if updated_application.id is null then
    raise exception 'APPLICATION_CANCELLATION_CONFLICT'
      using errcode = '40001';
  end if;

  update public.builder_inventory_units
  set
    status = 'available'::public.inventory_status,
    availability_note = 'Booking application cancelled by the buyer.',
    updated_at = current_time
  where id = unit_record.id
    and status = 'reserved'::public.inventory_status
    and not exists (
      select 1
      from public.property_unit_booking_applications other_application
      where other_application.unit_id = unit_record.id
        and other_application.id <> application_record.id
        and other_application.status in ('submitted', 'accepted')
    );

  insert into public.property_unit_booking_application_events (
    application_id,
    unit_id,
    project_id,
    actor_user_id,
    event_kind,
    metadata
  ) values (
    updated_application.id,
    updated_application.unit_id,
    updated_application.project_id,
    target_buyer_user_id,
    'cancelled',
    jsonb_strip_nulls(
      jsonb_build_object('reason', normalized_reason)
    )
  );

  return jsonb_build_object(
    'id', updated_application.id,
    'holdId', updated_application.hold_id,
    'unitId', updated_application.unit_id,
    'projectId', updated_application.project_id,
    'legalReviewRequestId', updated_application.legal_review_request_id,
    'status', updated_application.status,
    'buyerMessage', updated_application.buyer_message,
    'submittedAt', updated_application.submitted_at,
    'decisionDueAt', updated_application.decision_due_at,
    'ownerDecidedAt', updated_application.owner_decided_at,
    'ownerDecisionNote', updated_application.owner_decision_note,
    'acceptedUntil', updated_application.accepted_until,
    'endedAt', updated_application.ended_at
  );
end;
$$;

revoke all on function public.cancel_property_unit_booking_application(
  uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.cancel_property_unit_booking_application(
  uuid, uuid, text
) to service_role;

comment on function public.cancel_property_unit_booking_application(
  uuid, uuid, text
) is
  'Allows only the authenticated buyer to cancel an active private booking application and safely release still-reserved inventory. Creates no payment, agreement, sale, title or ownership transfer.';

create or replace function public.expire_property_unit_booking_applications(
  target_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_time timestamptz := clock_timestamp();
  candidate record;
  unit_record record;
  application_record public.property_unit_booking_applications%rowtype;
  expired_count integer := 0;
begin
  if target_limit is null
     or target_limit < 1
     or target_limit > 500 then
    raise exception 'TARGET_LIMIT_INVALID' using errcode = '22023';
  end if;

  for candidate in
    select
      application.id,
      application.unit_id
    from public.property_unit_booking_applications application
    where (
      application.status = 'submitted'
      and application.decision_due_at <= current_time
    ) or (
      application.status = 'accepted'
      and application.accepted_until is not null
      and application.accepted_until <= current_time
    )
    order by
      case
        when application.status = 'submitted'
          then application.decision_due_at
        else application.accepted_until
      end,
      application.id
    limit target_limit
  loop
    select
      unit.id,
      unit.project_id,
      unit.status
    into unit_record
    from public.builder_inventory_units unit
    where unit.id = candidate.unit_id
    for update;

    if unit_record.id is null then
      continue;
    end if;

    select application.*
    into application_record
    from public.property_unit_booking_applications application
    where application.id = candidate.id
    for update;

    if application_record.id is null then
      continue;
    end if;

    if not (
      (
        application_record.status = 'submitted'
        and application_record.decision_due_at <= current_time
      )
      or (
        application_record.status = 'accepted'
        and application_record.accepted_until is not null
        and application_record.accepted_until <= current_time
      )
    ) then
      continue;
    end if;

    update public.property_unit_booking_applications
    set
      status = 'expired',
      accepted_until = null,
      ended_at = current_time,
      updated_at = current_time
    where id = application_record.id
      and status in ('submitted', 'accepted');

    if not found then
      continue;
    end if;

    update public.builder_inventory_units
    set
      status = 'available'::public.inventory_status,
      availability_note = 'Booking application expired.',
      updated_at = current_time
    where id = unit_record.id
      and status = 'reserved'::public.inventory_status
      and not exists (
        select 1
        from public.property_unit_booking_applications other_application
        where other_application.unit_id = unit_record.id
          and other_application.id <> application_record.id
          and other_application.status in ('submitted', 'accepted')
      );

    insert into public.property_unit_booking_application_events (
      application_id,
      unit_id,
      project_id,
      actor_user_id,
      event_kind,
      metadata
    ) values (
      application_record.id,
      application_record.unit_id,
      application_record.project_id,
      null,
      'expired',
      jsonb_build_object(
        'previousStatus', application_record.status,
        'reason', 'automatic_expiry'
      )
    );

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

revoke all on function public.expire_property_unit_booking_applications(
  integer
) from public, anon, authenticated;

grant execute on function public.expire_property_unit_booking_applications(
  integer
) to service_role;

comment on function public.expire_property_unit_booking_applications(
  integer
) is
  'Expires overdue submitted or accepted property booking applications and safely releases only still-reserved inventory. Creates no payment, agreement, sale, title or ownership transfer.';

commit;
