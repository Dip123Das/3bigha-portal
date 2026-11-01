begin;

/*
 * MOB-43 — Atomic claim/save/review operations for Route order creation.
 * These functions protect an external Razorpay call from duplicate orders.
 */

create or replace function
  public.claim_property_advance_payment_order(
    target_payment_id uuid,
    target_buyer_user_id uuid,
    target_attempt_id uuid
  )
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed_id uuid;
begin
  if target_payment_id is null
     or target_buyer_user_id is null
     or target_attempt_id is null then
    raise exception 'PROPERTY_ADVANCE_PAYMENT_INPUT_INVALID'
      using errcode = '22023';
  end if;

  update public.property_unit_booking_advance_payments
  set
    order_creation_attempt = target_attempt_id,
    order_creation_started_at = now(),
    updated_at = now()
  where id = target_payment_id
    and buyer_user_id = target_buyer_user_id
    and status = 'order_preparing'
    and gateway_order_id is null
    and order_creation_attempt is null
  returning id into claimed_id;

  return claimed_id is not null;
end;
$$;

create or replace function
  public.save_property_advance_payment_order(
    target_payment_id uuid,
    target_buyer_user_id uuid,
    target_attempt_id uuid,
    target_gateway_order_id text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_record public.property_unit_booking_advance_payments%rowtype;
begin
  if target_payment_id is null
     or target_buyer_user_id is null
     or target_attempt_id is null
     or target_gateway_order_id is null
     or char_length(btrim(target_gateway_order_id)) not between 1 and 128 then
    raise exception 'PROPERTY_ADVANCE_PAYMENT_INPUT_INVALID'
      using errcode = '22023';
  end if;

  update public.property_unit_booking_advance_payments
  set
    gateway_order_id = target_gateway_order_id,
    status = 'payment_pending',
    order_creation_attempt = null,
    order_creation_started_at = null,
    updated_at = now()
  where id = target_payment_id
    and buyer_user_id = target_buyer_user_id
    and status = 'order_preparing'
    and gateway_order_id is null
    and order_creation_attempt = target_attempt_id
  returning * into saved_record;

  if not found then
    raise exception 'PROPERTY_ADVANCE_PAYMENT_ORDER_SAVE_CONFLICT'
      using errcode = '55000';
  end if;

  update public.property_unit_booking_advance_requests
  set
    status = 'payment_pending',
    provider = 'razorpay_route',
    gateway_request_reference = target_gateway_order_id,
    gateway_response_json = jsonb_build_object(
      'provider', 'razorpay_route',
      'orderId', target_gateway_order_id
    ),
    updated_at = now()
  where id = saved_record.advance_request_id
    and status in ('buyer_confirmed', 'gateway_configuration_pending')
    and gateway_request_reference is null
    and gateway_transaction_id is null
    and paid_at is null;

  if not found then
    raise exception 'PROPERTY_ADVANCE_REQUEST_ORDER_SAVE_CONFLICT'
      using errcode = '55000';
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
    saved_record.advance_request_id,
    saved_record.application_id,
    saved_record.unit_id,
    saved_record.project_id,
    target_buyer_user_id,
    'payment_pending',
    jsonb_build_object(
      'provider', 'razorpay_route',
      'orderId', target_gateway_order_id
    )
  );

  insert into public.property_unit_booking_advance_payment_events (
    payment_id,
    advance_request_id,
    application_id,
    unit_id,
    actor_user_id,
    event_kind,
    metadata
  ) values (
    saved_record.id,
    saved_record.advance_request_id,
    saved_record.application_id,
    saved_record.unit_id,
    target_buyer_user_id,
    'payment_order_created',
    jsonb_build_object(
      'gatewayOrderId', saved_record.gateway_order_id,
      'gatewayMode', saved_record.gateway_mode
    )
  );

  return jsonb_build_object(
    'paymentId', saved_record.id,
    'status', saved_record.status,
    'gatewayOrderId', saved_record.gateway_order_id,
    'amountPaise', saved_record.amount_paise,
    'currency', saved_record.currency
  );
end;
$$;

create or replace function
  public.mark_property_advance_payment_order_review(
    target_payment_id uuid,
    target_buyer_user_id uuid,
    target_attempt_id uuid
  )
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  review_record public.property_unit_booking_advance_payments%rowtype;
begin
  update public.property_unit_booking_advance_payments
  set
    status = 'review_required',
    failure_code = 'ORDER_CREATE_OUTCOME_UNCERTAIN',
    order_creation_attempt = null,
    order_creation_started_at = null,
    updated_at = now()
  where id = target_payment_id
    and buyer_user_id = target_buyer_user_id
    and status = 'order_preparing'
    and gateway_order_id is null
    and order_creation_attempt = target_attempt_id
  returning * into review_record;

  if not found then
    return false;
  end if;

  insert into public.property_unit_booking_advance_payment_events (
    payment_id,
    advance_request_id,
    application_id,
    unit_id,
    actor_user_id,
    event_kind,
    metadata
  ) values (
    review_record.id,
    review_record.advance_request_id,
    review_record.application_id,
    review_record.unit_id,
    null,
    'review_required',
    jsonb_build_object('reason', 'order_create_outcome_uncertain')
  );

  return true;
end;
$$;

revoke all on function
  public.claim_property_advance_payment_order(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function
  public.claim_property_advance_payment_order(uuid, uuid, uuid)
to service_role;

revoke all on function
  public.save_property_advance_payment_order(uuid, uuid, uuid, text)
from public, anon, authenticated;
grant execute on function
  public.save_property_advance_payment_order(uuid, uuid, uuid, text)
to service_role;

revoke all on function
  public.mark_property_advance_payment_order_review(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function
  public.mark_property_advance_payment_order_review(uuid, uuid, uuid)
to service_role;

commit;
