begin;

/* MOB-44: record provider-fetched property payment capture. */
create or replace function
  public.record_property_advance_payment_capture(
    target_payment_id uuid,
    target_buyer_user_id uuid,
    target_gateway_order_id text,
    target_gateway_payment_id text,
    target_gateway_transfer_id text,
    target_captured_amount_paise bigint,
    target_currency text,
    target_transfer_on_hold boolean
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_record
    public.property_unit_booking_advance_payments%rowtype;
  advance_record
    public.property_unit_booking_advance_requests%rowtype;
  next_status text;
  failure_reason text;
begin
  if target_payment_id is null
     or target_buyer_user_id is null
     or target_gateway_order_id is null
     or target_gateway_payment_id is null
     or char_length(btrim(target_gateway_payment_id)) not between 1 and 128 then
    raise exception 'PROPERTY_ADVANCE_CAPTURE_INPUT_INVALID'
      using errcode = '22023';
  end if;

  select payment.*
  into payment_record
  from public.property_unit_booking_advance_payments payment
  where payment.id = target_payment_id
  for update;

  if not found then
    raise exception 'PROPERTY_ADVANCE_PAYMENT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if payment_record.buyer_user_id <> target_buyer_user_id
     or payment_record.gateway_order_id <> target_gateway_order_id then
    raise exception 'PROPERTY_ADVANCE_CAPTURE_ACCESS_FORBIDDEN'
      using errcode = '42501';
  end if;

  if payment_record.status in ('paid_held', 'review_required')
     and payment_record.gateway_payment_id = target_gateway_payment_id then
    return jsonb_build_object(
      'status', payment_record.status,
      'paymentId', payment_record.id,
      'gatewayPaymentId', payment_record.gateway_payment_id
    );
  end if;

  if payment_record.status <> 'payment_pending' then
    raise exception 'PROPERTY_ADVANCE_CAPTURE_STATE_CONFLICT'
      using errcode = '55000';
  end if;

  select request.*
  into advance_record
  from public.property_unit_booking_advance_requests request
  where request.id = payment_record.advance_request_id
  for update;

  if not found
     or advance_record.gateway_request_reference <> target_gateway_order_id
     or advance_record.status <> 'payment_pending' then
    raise exception 'PROPERTY_ADVANCE_REQUEST_CAPTURE_CONFLICT'
      using errcode = '55000';
  end if;

  failure_reason := case
    when target_captured_amount_paise is distinct from payment_record.amount_paise
      then 'CAPTURE_AMOUNT_MISMATCH'
    when target_currency is distinct from payment_record.currency
      then 'CAPTURE_CURRENCY_MISMATCH'
    when target_transfer_on_hold is distinct from true
      then 'SELLER_TRANSFER_HOLD_UNVERIFIED'
    when target_gateway_transfer_id is null
      or char_length(btrim(target_gateway_transfer_id)) not between 1 and 128
      then 'SELLER_TRANSFER_REFERENCE_MISSING'
    else null
  end;
  next_status := case
    when failure_reason is null then 'paid_held'
    else 'review_required'
  end;

  update public.property_unit_booking_advance_payments
  set
    status = next_status,
    gateway_payment_id = target_gateway_payment_id,
    gateway_transfer_id = nullif(btrim(target_gateway_transfer_id), ''),
    paid_at = now(),
    failure_code = failure_reason,
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'capturedAmountPaise', target_captured_amount_paise,
        'capturedCurrency', target_currency,
        'sellerTransferOnHold', target_transfer_on_hold
      ),
    updated_at = now()
  where id = payment_record.id
  returning * into payment_record;

  if next_status = 'paid_held' then
    update public.property_unit_booking_advance_requests
    set
      status = 'paid',
      gateway_transaction_id = target_gateway_payment_id,
      gateway_response_json = coalesce(gateway_response_json, '{}'::jsonb)
        || jsonb_build_object(
          'provider', 'razorpay_route',
          'orderId', target_gateway_order_id,
          'paymentId', target_gateway_payment_id,
          'transferId', target_gateway_transfer_id,
          'transferOnHold', true
        ),
      paid_at = payment_record.paid_at,
      updated_at = now()
    where id = advance_record.id
      and status = 'payment_pending'
      and gateway_request_reference = target_gateway_order_id;

    if not found then
      raise exception 'PROPERTY_ADVANCE_REQUEST_CAPTURE_CONFLICT'
        using errcode = '55000';
    end if;

    insert into public.property_unit_booking_advance_events (
      advance_request_id, application_id, unit_id, project_id,
      actor_user_id, event_kind, metadata
    ) values (
      advance_record.id, advance_record.application_id, advance_record.unit_id,
      advance_record.project_id, null, 'paid',
      jsonb_build_object(
        'provider', 'razorpay_route',
        'paymentId', target_gateway_payment_id,
        'transferId', target_gateway_transfer_id,
        'transferOnHold', true
      )
    );
  else
    update public.property_unit_booking_advance_requests
    set
      status = 'review_required',
      failure_code = failure_reason,
      gateway_response_json = coalesce(gateway_response_json, '{}'::jsonb)
        || jsonb_build_object(
          'provider', 'razorpay_route',
          'orderId', target_gateway_order_id,
          'paymentId', target_gateway_payment_id,
          'transferId', target_gateway_transfer_id,
          'captureNeedsReview', true
        ),
      updated_at = now()
    where id = advance_record.id
      and status = 'payment_pending'
      and gateway_request_reference = target_gateway_order_id;

    if not found then
      raise exception 'PROPERTY_ADVANCE_REQUEST_CAPTURE_CONFLICT'
        using errcode = '55000';
    end if;

    insert into public.property_unit_booking_advance_events (
      advance_request_id, application_id, unit_id, project_id,
      actor_user_id, event_kind, metadata
    ) values (
      advance_record.id, advance_record.application_id, advance_record.unit_id,
      advance_record.project_id, null, 'review_required',
      jsonb_build_object('reason', failure_reason)
    );
  end if;

  insert into public.property_unit_booking_advance_payment_events (
    payment_id, advance_request_id, application_id, unit_id,
    actor_user_id, event_kind, metadata
  ) values (
    payment_record.id, payment_record.advance_request_id,
    payment_record.application_id, payment_record.unit_id, null,
    'payment_captured',
    jsonb_build_object(
      'gatewayPaymentId', target_gateway_payment_id,
      'gatewayTransferId', target_gateway_transfer_id,
      'status', next_status
    )
  );

  if next_status = 'review_required' then
    insert into public.property_unit_booking_advance_payment_events (
      payment_id, advance_request_id, application_id, unit_id,
      actor_user_id, event_kind, metadata
    ) values (
      payment_record.id, payment_record.advance_request_id,
      payment_record.application_id, payment_record.unit_id, null,
      'review_required', jsonb_build_object('reason', failure_reason)
    );
  end if;

  return jsonb_build_object(
    'status', next_status,
    'paymentId', payment_record.id,
    'gatewayPaymentId', payment_record.gateway_payment_id
  );
end;
$$;

revoke all on function
  public.record_property_advance_payment_capture(uuid, uuid, text, text, text, bigint, text, boolean)
from public, anon, authenticated;

grant execute on function
  public.record_property_advance_payment_capture(uuid, uuid, text, text, text, bigint, text, boolean)
to service_role;

commit;
