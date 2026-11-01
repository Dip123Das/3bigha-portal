begin;

/* MOB-46 — Full buyer refunds for paid property advances. */

alter table public.property_unit_booking_advance_requests
  drop constraint if exists property_unit_booking_advance_requests_status_check;

alter table public.property_unit_booking_advance_requests
  add constraint property_unit_booking_advance_requests_status_check
  check (status in (
    'owner_proposed',
    'buyer_confirmed',
    'gateway_configuration_pending',
    'gateway_order_created',
    'payment_pending',
    'paid',
    'refund_pending',
    'refunded',
    'failed',
    'expired',
    'cancelled',
    'review_required'
  ));

alter table public.property_unit_booking_advance_requests
  drop constraint if exists property_advance_paid_requires_gateway_confirmation;

alter table public.property_unit_booking_advance_requests
  add constraint property_advance_paid_requires_gateway_confirmation
  check (
    status not in ('paid', 'refunded')
    or (
      nullif(btrim(gateway_transaction_id), '') is not null
      and paid_at is not null
      and nullif(btrim(gateway_request_reference), '') is not null
    )
  );

alter table public.property_unit_booking_advance_requests
  drop constraint if exists property_advance_unpaid_has_no_paid_timestamp;

alter table public.property_unit_booking_advance_requests
  add constraint property_advance_unpaid_has_no_paid_timestamp
  check (status in ('paid', 'refund_pending', 'refunded') or paid_at is null);

alter table public.property_unit_booking_advance_requests
  drop constraint if exists property_advance_gateway_reference_scope;

alter table public.property_unit_booking_advance_requests
  add constraint property_advance_gateway_reference_scope
  check (
    status not in (
      'gateway_order_created', 'payment_pending', 'paid',
      'refund_pending', 'refunded', 'failed', 'review_required'
    )
    or nullif(btrim(gateway_request_reference), '') is not null
  );

alter table public.property_unit_booking_advance_payments
  add column if not exists gateway_refund_receipt text;

create unique index if not exists
  property_advance_payment_refund_receipt_uidx
on public.property_unit_booking_advance_payments(gateway_refund_receipt)
where gateway_refund_receipt is not null;

alter table public.property_unit_booking_advance_payment_events
  drop constraint if exists property_unit_booking_advance_payment_events_event_kind_check;

alter table public.property_unit_booking_advance_payment_events
  add constraint property_unit_booking_advance_payment_events_event_kind_check
  check (event_kind in (
    'payment_order_requested',
    'payment_order_created',
    'payment_captured',
    'payment_failed',
    'refund_requested',
    'refund_completed',
    'buyer_completion_confirmed',
    'owner_completion_confirmed',
    'settlement_release_requested',
    'settlement_released',
    'settled',
    'review_required'
  ));

create or replace function
  public.begin_property_advance_full_refund(
    target_payment_id uuid,
    target_buyer_user_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_record
    public.property_unit_booking_advance_payments%rowtype;
  refund_receipt text;
begin
  if target_payment_id is null or target_buyer_user_id is null then
    raise exception 'PROPERTY_ADVANCE_REFUND_INPUT_INVALID'
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

  if payment_record.buyer_user_id <> target_buyer_user_id then
    raise exception 'PROPERTY_ADVANCE_REFUND_ACCESS_FORBIDDEN'
      using errcode = '42501';
  end if;

  if payment_record.status = 'refunded' then
    return jsonb_build_object(
      'status', payment_record.status,
      'paymentId', payment_record.id,
      'gatewayRefundId', payment_record.gateway_refund_id,
      'refundReceipt', payment_record.gateway_refund_receipt,
      'shouldCreateRefund', false
    );
  end if;

  if payment_record.status = 'refund_pending' then
    return jsonb_build_object(
      'status', payment_record.status,
      'paymentId', payment_record.id,
      'gatewayPaymentId', payment_record.gateway_payment_id,
      'gatewayRefundId', payment_record.gateway_refund_id,
      'refundReceipt', payment_record.gateway_refund_receipt,
      'amountPaise', payment_record.amount_paise,
      'shouldCreateRefund', false
    );
  end if;

  if payment_record.status not in ('paid_held', 'review_required')
     or payment_record.settlement_release_requested_at is not null
     or payment_record.settled_at is not null
     or payment_record.refund_requested_at is not null
     or payment_record.gateway_refund_receipt is not null
     or payment_record.gateway_refund_id is not null
     or (
       payment_record.buyer_completion_confirmed_at is not null
       and payment_record.owner_completion_confirmed_at is not null
     )
     or payment_record.gateway_payment_id is null
     or payment_record.paid_at is null then
    raise exception 'PROPERTY_ADVANCE_REFUND_STATE_CONFLICT'
      using errcode = '55000';
  end if;

  refund_receipt := 'pa_ref_' || replace(payment_record.id::text, '-', '');

  update public.property_unit_booking_advance_payments
  set
    status = 'refund_pending',
    refund_amount_paise = amount_paise,
    refund_requested_at = now(),
    transfer_reversal_status = 'pending',
    gateway_refund_receipt = refund_receipt,
    updated_at = now()
  where id = payment_record.id
  returning * into payment_record;

  update public.property_unit_booking_advance_requests
  set
    status = 'refund_pending',
    gateway_transaction_id = payment_record.gateway_payment_id,
    paid_at = payment_record.paid_at,
    cancelled_at = coalesce(cancelled_at, now()),
    updated_at = now()
  where id = payment_record.advance_request_id
    and status in ('paid', 'review_required')
    and gateway_request_reference = payment_record.gateway_order_id
    and (gateway_transaction_id is null
      or gateway_transaction_id = payment_record.gateway_payment_id);

  if not found then
    raise exception 'PROPERTY_ADVANCE_REFUND_REQUEST_CONFLICT'
      using errcode = '55000';
  end if;

  insert into public.property_unit_booking_advance_payment_events (
    payment_id, advance_request_id, application_id, unit_id,
    actor_user_id, event_kind, metadata
  ) values (
    payment_record.id, payment_record.advance_request_id,
    payment_record.application_id, payment_record.unit_id,
    target_buyer_user_id, 'refund_requested',
    jsonb_build_object(
      'amountPaise', payment_record.amount_paise,
      'refundReceipt', refund_receipt,
      'reverseSellerTransfer', true
    )
  );

  return jsonb_build_object(
    'status', payment_record.status,
    'paymentId', payment_record.id,
    'gatewayPaymentId', payment_record.gateway_payment_id,
    'refundReceipt', refund_receipt,
    'amountPaise', payment_record.amount_paise,
    'shouldCreateRefund', true
  );
end;
$$;

create or replace function
  public.save_property_advance_refund_reference(
    target_payment_id uuid,
    target_buyer_user_id uuid,
    target_refund_receipt text,
    target_gateway_refund_id text
  )
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_id uuid;
begin
  if target_payment_id is null
     or target_buyer_user_id is null
     or target_refund_receipt is null
     or target_gateway_refund_id is null
     or char_length(btrim(target_gateway_refund_id)) not between 1 and 128 then
    raise exception 'PROPERTY_ADVANCE_REFUND_INPUT_INVALID'
      using errcode = '22023';
  end if;

  update public.property_unit_booking_advance_payments
  set
    gateway_refund_id = target_gateway_refund_id,
    updated_at = now()
  where id = target_payment_id
    and buyer_user_id = target_buyer_user_id
    and status = 'refund_pending'
    and gateway_refund_receipt = target_refund_receipt
    and (gateway_refund_id is null or gateway_refund_id = target_gateway_refund_id)
  returning id into updated_id;

  return updated_id is not null;
end;
$$;

create or replace function
  public.complete_property_advance_full_refund(
    target_payment_id uuid,
    target_gateway_refund_id text,
    target_refunded_amount_paise bigint,
    target_refund_status text,
    target_transfer_reversed boolean
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_record
    public.property_unit_booking_advance_payments%rowtype;
begin
  select payment.*
  into payment_record
  from public.property_unit_booking_advance_payments payment
  where payment.id = target_payment_id
  for update;

  if not found then
    raise exception 'PROPERTY_ADVANCE_PAYMENT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if payment_record.status = 'refunded'
     and payment_record.gateway_refund_id = target_gateway_refund_id then
    return jsonb_build_object('status', 'refunded');
  end if;

  if payment_record.status <> 'refund_pending'
     or payment_record.gateway_refund_id is distinct from target_gateway_refund_id then
    raise exception 'PROPERTY_ADVANCE_REFUND_STATE_CONFLICT'
      using errcode = '55000';
  end if;

  if target_refund_status <> 'processed'
     or target_refunded_amount_paise is distinct from payment_record.amount_paise
     or target_transfer_reversed is distinct from true then
    return jsonb_build_object('status', 'refund_pending');
  end if;

  update public.property_unit_booking_advance_payments
  set
    status = 'refunded',
    refund_amount_paise = amount_paise,
    transfer_reversal_status = case
      when gateway_transfer_id is null then 'not_required'
      else 'reversed'
    end,
    refunded_at = now(),
    updated_at = now()
  where id = payment_record.id
  returning * into payment_record;

  update public.property_unit_booking_advance_requests
  set
    status = 'refunded',
    gateway_transaction_id = payment_record.gateway_payment_id,
    paid_at = payment_record.paid_at,
    failure_code = null,
    gateway_response_json = coalesce(gateway_response_json, '{}'::jsonb)
      || jsonb_build_object(
        'refundId', target_gateway_refund_id,
        'refundAmountPaise', target_refunded_amount_paise,
        'sellerTransferReversed', true
      ),
    updated_at = now()
  where id = payment_record.advance_request_id
    and status = 'refund_pending'
    and gateway_transaction_id = payment_record.gateway_payment_id;

  if not found then
    raise exception 'PROPERTY_ADVANCE_REFUND_REQUEST_CONFLICT'
      using errcode = '55000';
  end if;

  insert into public.property_unit_booking_advance_payment_events (
    payment_id, advance_request_id, application_id, unit_id,
    actor_user_id, event_kind, metadata
  ) values (
    payment_record.id, payment_record.advance_request_id,
    payment_record.application_id, payment_record.unit_id,
    null, 'refund_completed',
    jsonb_build_object(
      'refundId', target_gateway_refund_id,
      'refundAmountPaise', target_refunded_amount_paise,
      'sellerTransferReversed', true
    )
  );

  return jsonb_build_object('status', 'refunded');
end;
$$;

create or replace function
  public.mark_property_advance_refund_review(
    target_payment_id uuid,
    target_failure_code text
  )
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_record
    public.property_unit_booking_advance_payments%rowtype;
begin
  if target_failure_code is null
     or char_length(btrim(target_failure_code)) not between 1 and 120 then
    raise exception 'PROPERTY_ADVANCE_REFUND_INPUT_INVALID'
      using errcode = '22023';
  end if;

  update public.property_unit_booking_advance_payments
  set
    status = 'review_required',
    failure_code = target_failure_code,
    transfer_reversal_status = case
      when transfer_reversal_status = 'reversed' then 'reversed'
      else 'review_required'
    end,
    updated_at = now()
  where id = target_payment_id
    and status = 'refund_pending'
  returning * into payment_record;

  if not found then
    return false;
  end if;

  update public.property_unit_booking_advance_requests
  set
    status = 'review_required',
    failure_code = target_failure_code,
    updated_at = now()
  where id = payment_record.advance_request_id
    and status = 'refund_pending';

  insert into public.property_unit_booking_advance_payment_events (
    payment_id, advance_request_id, application_id, unit_id,
    actor_user_id, event_kind, metadata
  ) values (
    payment_record.id, payment_record.advance_request_id,
    payment_record.application_id, payment_record.unit_id,
    null, 'review_required',
    jsonb_build_object('reason', target_failure_code)
  );

  return true;
end;
$$;

revoke all on function
  public.begin_property_advance_full_refund(uuid, uuid)
from public, anon, authenticated;
grant execute on function
  public.begin_property_advance_full_refund(uuid, uuid)
to service_role;

revoke all on function
  public.save_property_advance_refund_reference(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function
  public.save_property_advance_refund_reference(uuid, uuid, text, text)
to service_role;

revoke all on function
  public.complete_property_advance_full_refund(uuid, text, bigint, text, boolean)
from public, anon, authenticated;
grant execute on function
  public.complete_property_advance_full_refund(uuid, text, bigint, text, boolean)
to service_role;

revoke all on function
  public.mark_property_advance_refund_review(uuid, text)
from public, anon, authenticated;
grant execute on function
  public.mark_property_advance_refund_review(uuid, text)
to service_role;

commit;
