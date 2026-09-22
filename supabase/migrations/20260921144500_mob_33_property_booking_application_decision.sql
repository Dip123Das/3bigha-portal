begin;

/*
 * MOB-33 — Owner-only booking-application decision authority.
 *
 * Acceptance keeps the inventory reserved for a separate 48-hour next-step
 * window. Decline releases only a unit that is still reserved. Neither path
 * creates payment, agreement, sale, title or ownership transfer.
 */

create or replace function public.decide_property_unit_booking_application(
  target_owner_user_id uuid,
  target_application_id uuid,
  target_decision text,
  target_decision_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_time timestamptz := clock_timestamp();
  target_unit_id uuid;
  normalized_decision text;
  normalized_note text;
  unit_record record;
  application_record public.property_unit_booking_applications%rowtype;
  updated_application public.property_unit_booking_applications%rowtype;
begin
  if target_owner_user_id is null then
    raise exception 'OWNER_REQUIRED' using errcode = '22023';
  end if;

  if target_application_id is null then
    raise exception 'APPLICATION_ID_INVALID' using errcode = '22023';
  end if;

  normalized_decision := lower(btrim(coalesce(target_decision, '')));

  if normalized_decision not in ('accepted', 'declined') then
    raise exception 'DECISION_INVALID' using errcode = '22023';
  end if;

  normalized_note := nullif(btrim(target_decision_note), '');

  if normalized_note is not null
     and char_length(normalized_note) > 1000 then
    raise exception 'DECISION_NOTE_INVALID' using errcode = '22023';
  end if;

  if normalized_decision = 'declined'
     and normalized_note is null then
    raise exception 'DECISION_NOTE_REQUIRED' using errcode = '22023';
  end if;

  /*
   * Resolve the immutable unit reference first. Canonical lock order remains
   * unit before application.
   */
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
    unit.status,
    unit.trust_status,
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

  select application.*
  into application_record
  from public.property_unit_booking_applications application
  where application.id = target_application_id
  for update;

  if application_record.id is null then
    raise exception 'APPLICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if application_record.owner_user_id <> target_owner_user_id
     or unit_record.owner_user_id <> target_owner_user_id then
    raise exception 'APPLICATION_ACCESS_FORBIDDEN' using errcode = '42501';
  end if;

  if application_record.unit_id <> unit_record.id
     or application_record.project_id <> unit_record.project_id then
    raise exception 'APPLICATION_TARGET_MISMATCH' using errcode = '42501';
  end if;

  if application_record.status <> 'submitted' then
    raise exception 'APPLICATION_NOT_PENDING' using errcode = '55000';
  end if;

  if application_record.decision_due_at <= current_time then
    raise exception 'APPLICATION_DECISION_EXPIRED' using errcode = '55000';
  end if;

  if unit_record.status::text <> 'reserved' then
    raise exception 'UNIT_NOT_RESERVED' using errcode = '55000';
  end if;

  if normalized_decision = 'accepted' then
    update public.property_unit_booking_applications
    set
      status = 'accepted',
      owner_decided_at = current_time,
      owner_decision_note = normalized_note,
      accepted_until = current_time + interval '48 hours',
      updated_at = current_time
    where id = application_record.id
      and status = 'submitted'
    returning * into updated_application;

    update public.builder_inventory_units
    set
      availability_note =
        'Reserved after owner acceptance of a private booking application.',
      updated_at = current_time
    where id = unit_record.id
      and status = 'reserved'::public.inventory_status;
  else
    update public.property_unit_booking_applications
    set
      status = 'declined',
      owner_decided_at = current_time,
      owner_decision_note = normalized_note,
      accepted_until = null,
      ended_at = current_time,
      updated_at = current_time
    where id = application_record.id
      and status = 'submitted'
    returning * into updated_application;

    update public.builder_inventory_units
    set
      status = 'available'::public.inventory_status,
      availability_note = 'Booking application declined by the owner.',
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
  end if;

  if updated_application.id is null then
    raise exception 'APPLICATION_DECISION_CONFLICT' using errcode = '40001';
  end if;

  if not found then
    raise exception 'UNIT_STATUS_CONFLICT' using errcode = '40001';
  end if;

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
    target_owner_user_id,
    normalized_decision,
    jsonb_strip_nulls(
      jsonb_build_object(
        'decisionNote', updated_application.owner_decision_note,
        'acceptedUntil', updated_application.accepted_until
      )
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

revoke all on function public.decide_property_unit_booking_application(
  uuid, uuid, text, text
) from public, anon, authenticated;

grant execute on function public.decide_property_unit_booking_application(
  uuid, uuid, text, text
) to service_role;

comment on function public.decide_property_unit_booking_application(
  uuid, uuid, text, text
) is
  'Allows only the canonical unit owner to accept or decline a submitted private booking application. Acceptance preserves reserved inventory; decline safely releases it. Creates no payment, agreement, sale, title or ownership transfer.';

commit;
