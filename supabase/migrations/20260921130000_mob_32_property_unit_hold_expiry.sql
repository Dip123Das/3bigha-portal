begin;

/*
 * MOB-32 — Bounded automatic expiry reconciliation.
 *
 * Candidate ids are discovered without locking. Each canonical unit is then
 * locked before its hold row, preserving the global unit-first lock order.
 */

create or replace function public.expire_property_unit_booking_holds(
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
  hold_record public.property_unit_booking_holds%rowtype;
  expired_count integer := 0;
begin
  if target_limit is null
     or target_limit < 1
     or target_limit > 500 then
    raise exception 'EXPIRY_LIMIT_INVALID' using errcode = '22023';
  end if;

  for candidate in
    select hold_row.id, hold_row.unit_id
    from public.property_unit_booking_holds hold_row
    where hold_row.status = 'active'
      and hold_row.expires_at <= current_time
    order by hold_row.expires_at, hold_row.id
    limit target_limit
  loop
    perform 1
    from public.builder_inventory_units unit
    where unit.id = candidate.unit_id
    for update;

    if not found then
      raise exception 'UNIT_NOT_FOUND' using errcode = 'P0002';
    end if;

    select hold_row.*
    into hold_record
    from public.property_unit_booking_holds hold_row
    where hold_row.id = candidate.id
    for update;

    if hold_record.id is null
       or hold_record.status <> 'active'
       or hold_record.expires_at > current_time then
      continue;
    end if;

    update public.property_unit_booking_holds
    set
      status = 'expired',
      released_at = current_time,
      updated_at = current_time
    where id = hold_record.id
      and status = 'active'
      and expires_at <= current_time
    returning * into hold_record;

    if hold_record.id is null then
      continue;
    end if;

    insert into public.property_unit_booking_hold_events (
      hold_id, unit_id, project_id, buyer_user_id, owner_user_id,
      actor_user_id, event_kind, metadata
    ) values (
      hold_record.id, hold_record.unit_id, hold_record.project_id,
      hold_record.buyer_user_id, hold_record.owner_user_id, null,
      'hold_expired',
      jsonb_build_object('reason', 'automatic_expiry')
    );

    update public.builder_inventory_units unit
    set
      status = 'available'::public.inventory_status,
      availability_note = 'Mobile booking hold expired.',
      updated_at = current_time
    where unit.id = hold_record.unit_id
      and unit.status = 'reserved'::public.inventory_status
      and not exists (
        select 1
        from public.property_unit_booking_holds other_hold
        where other_hold.unit_id = unit.id
          and other_hold.status = 'active'
      );

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

revoke all on function public.expire_property_unit_booking_holds(integer)
  from public, anon, authenticated;

grant execute on function public.expire_property_unit_booking_holds(integer)
  to service_role;

comment on function public.expire_property_unit_booking_holds(integer) is
  'Reconciles a bounded batch of expired property holds and safely releases only their reserved inventory units.';

commit;
