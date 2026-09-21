begin;

/*
 * MOB-32 — Buyer cancellation and expiry-on-access reconciliation.
 *
 * The exact unit is locked before the hold row, matching acquisition order.
 * This prevents cancellation and acquisition from racing inventory status.
 */

create or replace function public.cancel_property_unit_booking_hold(
  target_buyer_user_id uuid,
  target_hold_id uuid,
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
  hold_record public.property_unit_booking_holds%rowtype;
  terminal_event_kind text;
  safe_reason text;
begin
  if target_buyer_user_id is null then
    raise exception 'BUYER_REQUIRED' using errcode = '22023';
  end if;

  if target_hold_id is null then
    raise exception 'HOLD_ID_INVALID' using errcode = '22023';
  end if;

  safe_reason := nullif(
    left(btrim(coalesce(target_reason, '')), 500),
    ''
  );

  select hold_row.unit_id
  into target_unit_id
  from public.property_unit_booking_holds hold_row
  where hold_row.id = target_hold_id;

  if target_unit_id is null then
    raise exception 'HOLD_NOT_FOUND' using errcode = 'P0002';
  end if;

  perform 1
  from public.builder_inventory_units unit
  where unit.id = target_unit_id
  for update;

  if not found then
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

  if hold_record.status = 'cancelled'
     or hold_record.status = 'expired' then
    return jsonb_build_object(
      'id', hold_record.id,
      'unitId', hold_record.unit_id,
      'projectId', hold_record.project_id,
      'status', hold_record.status,
      'heldAt', hold_record.held_at,
      'expiresAt', hold_record.expires_at,
      'releasedAt', hold_record.released_at
    );
  end if;

  if hold_record.status = 'converted' then
    raise exception 'CONVERTED_HOLD_CANNOT_BE_CANCELLED'
      using errcode = '55000';
  end if;

  if hold_record.status <> 'active' then
    raise exception 'HOLD_STATE_INVALID' using errcode = '55000';
  end if;

  if hold_record.expires_at <= current_time then
    terminal_event_kind := 'hold_expired';

    update public.property_unit_booking_holds
    set
      status = 'expired',
      released_at = current_time,
      updated_at = current_time
    where id = target_hold_id
      and status = 'active'
    returning * into hold_record;
  else
    terminal_event_kind := 'hold_cancelled';

    update public.property_unit_booking_holds
    set
      status = 'cancelled',
      cancelled_at = current_time,
      released_at = current_time,
      cancellation_reason = safe_reason,
      updated_at = current_time
    where id = target_hold_id
      and status = 'active'
    returning * into hold_record;
  end if;

  if hold_record.id is null then
    raise exception 'HOLD_STATE_CONFLICT' using errcode = '40001';
  end if;

  insert into public.property_unit_booking_hold_events (
    hold_id, unit_id, project_id, buyer_user_id, owner_user_id,
    actor_user_id, event_kind, metadata
  ) values (
    hold_record.id, hold_record.unit_id, hold_record.project_id,
    hold_record.buyer_user_id, hold_record.owner_user_id,
    target_buyer_user_id, terminal_event_kind,
    jsonb_strip_nulls(
      jsonb_build_object(
        'reason',
        case
          when terminal_event_kind = 'hold_cancelled'
            then safe_reason
          else 'expired_before_cancellation'
        end
      )
    )
  );

  update public.builder_inventory_units unit
  set
    status = 'available'::public.inventory_status,
    availability_note =
      case
        when terminal_event_kind = 'hold_expired'
          then 'Mobile booking hold expired.'
        else 'Mobile booking hold cancelled by buyer.'
      end,
    updated_at = current_time
  where unit.id = hold_record.unit_id
    and unit.status = 'reserved'::public.inventory_status
    and not exists (
      select 1
      from public.property_unit_booking_holds other_hold
      where other_hold.unit_id = unit.id
        and other_hold.status = 'active'
    );

  return jsonb_build_object(
    'id', hold_record.id,
    'unitId', hold_record.unit_id,
    'projectId', hold_record.project_id,
    'status', hold_record.status,
    'heldAt', hold_record.held_at,
    'expiresAt', hold_record.expires_at,
    'releasedAt', hold_record.released_at
  );
end;
$$;

revoke all on function public.cancel_property_unit_booking_hold(
  uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.cancel_property_unit_booking_hold(
  uuid, uuid, text
) to service_role;

comment on function public.cancel_property_unit_booking_hold(
  uuid, uuid, text
) is
  'Cancels a buyer-owned property-unit hold or reconciles it as expired while preserving canonical inventory state.';

commit;
