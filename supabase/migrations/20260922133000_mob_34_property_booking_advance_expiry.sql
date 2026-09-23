/*
 * MOB-34: automatic expiry of unpaid property-booking advance requests.
 *
 * Only pre-gateway states without gateway or transaction references are
 * eligible. Expiry does not release inventory, change the accepted booking
 * application, create a payment, or change any agreement, sale, title or
 * ownership state.
 */

create or replace function
  public.expire_property_unit_booking_advances (
    target_limit integer default 100
  )
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  action_time timestamptz := now();
  expired_count integer := 0;

  candidate record;
  unit_record record;
  application_record record;
  request_record record;
  expired_request record;
begin
  if target_limit is null
     or target_limit < 1
     or target_limit > 500 then
    raise exception 'EXPIRY_LIMIT_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Candidate discovery takes no row locks. Each candidate is then handled
   * using the canonical unit-first lock order and revalidated under lock.
   */
  for candidate in
    select
      advance_request.id,
      advance_request.application_id,
      advance_request.unit_id,
      advance_request.expires_at
    from public.property_unit_booking_advance_requests advance_request
    where advance_request.status in (
      'owner_proposed',
      'buyer_confirmed',
      'gateway_configuration_pending'
    )
      and advance_request.expires_at <= action_time
      and advance_request.gateway_request_reference is null
      and advance_request.gateway_transaction_id is null
      and advance_request.gateway_response_json is null
      and advance_request.paid_at is null
    order by
      advance_request.expires_at,
      advance_request.id
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

    if not found then
      continue;
    end if;

    select application.*
    into application_record
    from public.property_unit_booking_applications application
    where application.id = candidate.application_id
    for update;

    if not found then
      continue;
    end if;

    select advance_request.*
    into request_record
    from public.property_unit_booking_advance_requests advance_request
    where advance_request.id = candidate.id
    for update;

    if not found then
      continue;
    end if;

    /*
     * Revalidate every eligibility and binding condition after all locks.
     * Changed, terminal or gateway-managed rows are skipped safely.
     */
    if request_record.status not in (
      'owner_proposed',
      'buyer_confirmed',
      'gateway_configuration_pending'
    ) then
      continue;
    end if;

    if request_record.expires_at > action_time then
      continue;
    end if;

    if request_record.gateway_request_reference is not null
       or request_record.gateway_transaction_id is not null
       or request_record.gateway_response_json is not null
       or request_record.paid_at is not null then
      continue;
    end if;

    if request_record.application_id <> application_record.id
       or request_record.hold_id <> application_record.hold_id
       or request_record.unit_id <> application_record.unit_id
       or request_record.project_id <> application_record.project_id
       or request_record.buyer_user_id
         <> application_record.buyer_user_id
       or request_record.owner_user_id
         <> application_record.owner_user_id
       or request_record.unit_id <> unit_record.id
       or request_record.project_id <> unit_record.project_id then
      continue;
    end if;

    update public.property_unit_booking_advance_requests
    set
      status = 'expired',
      failure_code = 'ADVANCE_WINDOW_EXPIRED',
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'expiryReason', 'automatic_expiry',
          'gatewayOrderCreated', false,
          'paymentCollected', false
        ),
      updated_at = action_time
    where id = request_record.id
      and status in (
        'owner_proposed',
        'buyer_confirmed',
        'gateway_configuration_pending'
      )
      and expires_at <= action_time
      and gateway_request_reference is null
      and gateway_transaction_id is null
      and gateway_response_json is null
      and paid_at is null
    returning * into expired_request;

    if not found then
      continue;
    end if;

    insert into public.property_unit_booking_advance_events (
      advance_request_id,
      application_id,
      unit_id,
      project_id,
      actor_user_id,
      event_kind,
      metadata
    ) values (
      expired_request.id,
      expired_request.application_id,
      expired_request.unit_id,
      expired_request.project_id,
      null,
      'expired',
      jsonb_build_object(
        'reason', 'automatic_expiry',
        'previousStatus', request_record.status,
        'expiredAt', action_time,
        'gatewayOrderCreated', false,
        'paymentCollected', false
      )
    );

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

revoke all on function
  public.expire_property_unit_booking_advances(integer)
from public, anon, authenticated;

grant execute on function
  public.expire_property_unit_booking_advances(integer)
to service_role;

comment on function
  public.expire_property_unit_booking_advances(integer) is
  'Expires unpaid pre-gateway property-advance requests in bounded batches. It preserves booking applications and inventory and performs no gateway request, payment collection, agreement creation, sale, title change or ownership transfer.';
