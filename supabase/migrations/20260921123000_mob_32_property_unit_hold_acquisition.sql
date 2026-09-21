begin;

/*
 * MOB-32 — Atomic property-unit hold acquisition.
 *
 * Only the server service role may invoke this function. The caller-provided
 * buyer id must come from an authenticated mobile request, never from an
 * untrusted request body.
 */

create or replace function public.acquire_property_unit_booking_hold(
  target_buyer_user_id uuid,
  target_unit_id uuid,
  target_legal_review_request_id uuid,
  target_intent_version text,
  target_acknowledged_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_time timestamptz := clock_timestamp();
  hold_expires_at timestamptz;
  unit_record record;
  active_hold record;
  legal_review record;
  created_hold public.property_unit_booking_holds%rowtype;
begin
  if target_buyer_user_id is null then
    raise exception 'BUYER_REQUIRED' using errcode = '22023';
  end if;

  if target_unit_id is null then
    raise exception 'UNIT_ID_INVALID' using errcode = '22023';
  end if;

  if target_legal_review_request_id is null then
    raise exception 'LEGAL_REVIEW_REQUIRED' using errcode = '22023';
  end if;

  if nullif(btrim(target_intent_version), '') is null
     or target_intent_version <> 'property-unit-booking-intent-v1' then
    raise exception 'INTENT_VERSION_INVALID' using errcode = '22023';
  end if;

  if target_acknowledged_at is null
     or target_acknowledged_at > current_time + interval '1 minute'
     or target_acknowledged_at < current_time - interval '5 minutes' then
    raise exception 'ACKNOWLEDGEMENT_INVALID' using errcode = '22023';
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

  if unit_record.owner_user_id = target_buyer_user_id then
    raise exception 'SELF_HOLD_FORBIDDEN' using errcode = '42501';
  end if;

  select hold_row.*
  into active_hold
  from public.property_unit_booking_holds hold_row
  where hold_row.unit_id = target_unit_id
    and hold_row.status = 'active'
  for update;

  if active_hold.id is not null then
    if active_hold.expires_at > current_time then
      raise exception 'UNIT_ALREADY_HELD' using errcode = '23505';
    end if;

    update public.property_unit_booking_holds
    set
      status = 'expired',
      released_at = current_time,
      updated_at = current_time
    where id = active_hold.id
      and status = 'active';

    insert into public.property_unit_booking_hold_events (
      hold_id, unit_id, project_id, buyer_user_id, owner_user_id,
      actor_user_id, event_kind, metadata
    ) values (
      active_hold.id, active_hold.unit_id, active_hold.project_id,
      active_hold.buyer_user_id, active_hold.owner_user_id, null,
      'hold_expired',
      jsonb_build_object('reason', 'reconciled_before_new_hold')
    );

    if unit_record.status::text = 'reserved' then
      update public.builder_inventory_units
      set
        status = 'available'::public.inventory_status,
        availability_note = 'Previous mobile booking hold expired.',
        updated_at = current_time
      where id = target_unit_id;

      unit_record.status := 'available'::public.inventory_status;
    end if;
  end if;

  if unit_record.project_status::text <> 'active'
     or unit_record.project_is_active is distinct from true then
    raise exception 'PROJECT_NOT_ACTIVE' using errcode = '22023';
  end if;

  if unit_record.trust_status::text <> 'verified' then
    raise exception 'UNIT_NOT_VERIFIED' using errcode = '22023';
  end if;

  if unit_record.status::text <> 'available' then
    raise exception 'UNIT_NOT_AVAILABLE' using errcode = '55000';
  end if;

  if not exists (
    select 1
    from public.v_property_unit_transaction_readiness readiness
    where readiness.unit_id = target_unit_id
      and readiness.transaction_data_ready = true
  ) then
    raise exception 'UNIT_NOT_TRANSACTION_READY' using errcode = '22023';
  end if;

  select review.*
  into legal_review
  from public.property_unit_legal_review_requests review
  where review.id = target_legal_review_request_id
  for update;

  if legal_review.id is null then
    raise exception 'LEGAL_REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;

  if legal_review.buyer_user_id <> target_buyer_user_id
     or legal_review.unit_id <> target_unit_id
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

  hold_expires_at := least(
    current_time + interval '15 minutes',
    legal_review.expires_at
  );

  if hold_expires_at <= current_time then
    raise exception 'LEGAL_REVIEW_EXPIRED' using errcode = '42501';
  end if;

  insert into public.property_unit_booking_holds (
    unit_id, project_id, buyer_user_id, owner_user_id,
    legal_review_request_id, status, intent_version,
    buyer_acknowledged_at, held_at, expires_at
  ) values (
    target_unit_id, unit_record.project_id, target_buyer_user_id,
    unit_record.owner_user_id, target_legal_review_request_id, 'active',
    target_intent_version, target_acknowledged_at, current_time,
    hold_expires_at
  )
  returning * into created_hold;

  update public.builder_inventory_units
  set
    status = 'reserved'::public.inventory_status,
    availability_note = 'Temporarily held through authenticated booking intent.',
    updated_at = current_time
  where id = target_unit_id
    and status = 'available'::public.inventory_status;

  if not found then
    raise exception 'UNIT_STATUS_CONFLICT' using errcode = '40001';
  end if;

  insert into public.property_unit_booking_hold_events (
    hold_id, unit_id, project_id, buyer_user_id, owner_user_id,
    actor_user_id, event_kind, metadata
  ) values (
    created_hold.id, created_hold.unit_id, created_hold.project_id,
    created_hold.buyer_user_id, created_hold.owner_user_id,
    target_buyer_user_id, 'hold_created',
    jsonb_build_object(
      'intentVersion', created_hold.intent_version,
      'expiresAt', created_hold.expires_at
    )
  );

  return jsonb_build_object(
    'id', created_hold.id,
    'unitId', created_hold.unit_id,
    'projectId', created_hold.project_id,
    'buyerUserId', created_hold.buyer_user_id,
    'ownerUserId', created_hold.owner_user_id,
    'legalReviewRequestId', created_hold.legal_review_request_id,
    'status', created_hold.status,
    'heldAt', created_hold.held_at,
    'expiresAt', created_hold.expires_at
  );
end;
$$;

revoke all on function public.acquire_property_unit_booking_hold(
  uuid, uuid, uuid, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.acquire_property_unit_booking_hold(
  uuid, uuid, uuid, text, timestamptz
) to service_role;

comment on function public.acquire_property_unit_booking_hold(
  uuid, uuid, uuid, text, timestamptz
) is
  'Atomically acquires a 15-minute property-unit hold after verified inventory and confidential legal-review authorization.';

commit;
