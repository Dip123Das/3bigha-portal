begin;

/*
 * MOB-42 — Server-authoritative preparation of a property advance payment.
 * Reserves an isolated ledger row only; it does not call Razorpay, create an
 * order, or collect money.
 */
create or replace function
  public.prepare_property_unit_booking_advance_payment(
    target_buyer_user_id uuid,
    target_advance_request_id uuid,
    target_idempotency_key uuid,
    target_gateway_mode text
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
  advance_record
    public.property_unit_booking_advance_requests%rowtype;
  seller_account
    public.property_seller_razorpay_route_accounts%rowtype;
  payment_record
    public.property_unit_booking_advance_payments%rowtype;
begin
  if target_buyer_user_id is null
     or target_advance_request_id is null
     or target_idempotency_key is null
     or target_gateway_mode is null
     or target_gateway_mode not in ('test', 'live') then
    raise exception 'PROPERTY_ADVANCE_PAYMENT_INPUT_INVALID'
      using errcode = '22023';
  end if;

  /* Resolve first, then lock in the lifecycle's unit-first order. */
  select request.unit_id
  into target_unit_id
  from public.property_unit_booking_advance_requests request
  where request.id = target_advance_request_id;

  if target_unit_id is null then
    raise exception 'PROPERTY_ADVANCE_REQUEST_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select unit.id, unit.project_id, unit.status
  into unit_record
  from public.builder_inventory_units unit
  where unit.id = target_unit_id
  for update;

  if not found then
    raise exception 'PROPERTY_ADVANCE_UNIT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select application.*
  into application_record
  from public.property_unit_booking_applications application
  join public.property_unit_booking_advance_requests request
    on request.application_id = application.id
  where request.id = target_advance_request_id
  for update of application;

  if not found then
    raise exception 'PROPERTY_ADVANCE_APPLICATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select request.*
  into advance_record
  from public.property_unit_booking_advance_requests request
  where request.id = target_advance_request_id
  for update;

  if not found then
    raise exception 'PROPERTY_ADVANCE_REQUEST_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if advance_record.buyer_user_id <> target_buyer_user_id
     or application_record.buyer_user_id <> target_buyer_user_id then
    raise exception 'PROPERTY_ADVANCE_PAYMENT_ACCESS_FORBIDDEN'
      using errcode = '42501';
  end if;

  if advance_record.owner_user_id <> application_record.owner_user_id
     or advance_record.unit_id <> unit_record.id
     or advance_record.project_id <> unit_record.project_id
     or advance_record.hold_id <> application_record.hold_id
     or advance_record.buyer_user_id <> application_record.buyer_user_id then
    raise exception 'PROPERTY_ADVANCE_PAYMENT_TARGET_MISMATCH'
      using errcode = '42501';
  end if;

  select payment.*
  into payment_record
  from public.property_unit_booking_advance_payments payment
  where payment.advance_request_id = advance_record.id
  for update;

  if found then
    if payment_record.buyer_user_id <> target_buyer_user_id
       or payment_record.idempotency_key <> target_idempotency_key
       or payment_record.gateway_mode <> target_gateway_mode then
      raise exception 'PROPERTY_ADVANCE_PAYMENT_ALREADY_PREPARED'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'paymentId', payment_record.id,
      'status', payment_record.status,
      'gatewayOrderId', payment_record.gateway_order_id,
      'amountPaise', payment_record.amount_paise,
      'currency', payment_record.currency,
      'createdAt', payment_record.created_at
    );
  end if;

  if application_record.status <> 'accepted'
     or application_record.accepted_until is null
     or application_record.accepted_until <= action_time then
    raise exception 'PROPERTY_ADVANCE_APPLICATION_NOT_ACCEPTED'
      using errcode = '55000';
  end if;

  if advance_record.status <> 'buyer_confirmed'
     or advance_record.buyer_consent_version
       <> 'property-booking-advance-v1'
     or advance_record.buyer_consented_at is null
     or advance_record.expires_at <= action_time then
    raise exception 'PROPERTY_ADVANCE_BUYER_CONSENT_REQUIRED'
      using errcode = '55000';
  end if;

  if unit_record.status <> 'reserved'::public.inventory_status then
    raise exception 'PROPERTY_ADVANCE_UNIT_NOT_RESERVED'
      using errcode = '55000';
  end if;

  select account.*
  into seller_account
  from public.property_seller_razorpay_route_accounts account
  where account.owner_user_id = advance_record.owner_user_id
  for update;

  if not found
     or seller_account.status <> 'active'
     or not seller_account.details_submitted
     or not seller_account.transfers_enabled
     or not seller_account.settlements_enabled
     or seller_account.provider_live is distinct from true
     or seller_account.provider_activated_at is null
     or seller_account.last_verified_at is null
     or seller_account.last_verified_at < action_time - interval '10 minutes'
     or seller_account.disabled_at is not null then
    raise exception 'PROPERTY_ADVANCE_SELLER_ROUTE_NOT_READY'
      using errcode = '55000';
  end if;

  insert into public.property_unit_booking_advance_payments (
    advance_request_id,
    application_id,
    hold_id,
    unit_id,
    project_id,
    buyer_user_id,
    owner_user_id,
    provider,
    gateway_mode,
    currency,
    amount_paise,
    seller_linked_account_id,
    idempotency_key,
    status
  ) values (
    advance_record.id,
    advance_record.application_id,
    advance_record.hold_id,
    advance_record.unit_id,
    advance_record.project_id,
    advance_record.buyer_user_id,
    advance_record.owner_user_id,
    'razorpay_route',
    target_gateway_mode,
    advance_record.currency,
    advance_record.advance_amount_paise,
    seller_account.razorpay_linked_account_id,
    target_idempotency_key,
    'order_preparing'
  )
  returning * into payment_record;

  insert into public.property_unit_booking_advance_payment_events (
    payment_id,
    advance_request_id,
    application_id,
    unit_id,
    actor_user_id,
    event_kind,
    metadata
  ) values (
    payment_record.id,
    payment_record.advance_request_id,
    payment_record.application_id,
    payment_record.unit_id,
    target_buyer_user_id,
    'payment_order_requested',
    jsonb_build_object(
      'provider', 'razorpay_route',
      'gatewayMode', payment_record.gateway_mode,
      'amountPaise', payment_record.amount_paise
    )
  );

  return jsonb_build_object(
    'paymentId', payment_record.id,
    'status', payment_record.status,
    'gatewayOrderId', payment_record.gateway_order_id,
    'amountPaise', payment_record.amount_paise,
    'currency', payment_record.currency,
    'createdAt', payment_record.created_at
  );
end;
$$;

revoke all on function
  public.prepare_property_unit_booking_advance_payment(uuid, uuid, uuid, text)
from public, anon, authenticated;

grant execute on function
  public.prepare_property_unit_booking_advance_payment(uuid, uuid, uuid, text)
to service_role;

comment on function
  public.prepare_property_unit_booking_advance_payment(uuid, uuid, uuid, text) is
  'Creates or replays a property advance payment ledger reservation only after buyer consent, current accepted booking, reserved inventory and a recently verified seller Route account. It does not call Razorpay or create an order.';

commit;
