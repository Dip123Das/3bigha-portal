begin;

/* MOB-47 — Both-party completion and held Route settlement release. */

create or replace function
  public.confirm_property_advance_deal_completion(
    target_payment_id uuid,
    target_actor_user_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_record
    public.property_unit_booking_advance_payments%rowtype;
  confirmation_column text;
  confirmed_at timestamptz;
begin
  if target_payment_id is null or target_actor_user_id is null then
    raise exception 'PROPERTY_ADVANCE_COMPLETION_INPUT_INVALID'
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

  if target_actor_user_id = payment_record.buyer_user_id then
    confirmation_column := 'buyer_completion_confirmed_at';
    confirmed_at := payment_record.buyer_completion_confirmed_at;
  elsif target_actor_user_id = payment_record.owner_user_id then
    confirmation_column := 'owner_completion_confirmed_at';
    confirmed_at := payment_record.owner_completion_confirmed_at;
  else
    raise exception 'PROPERTY_ADVANCE_COMPLETION_ACCESS_FORBIDDEN'
      using errcode = '42501';
  end if;

  if payment_record.status not in ('paid_held', 'settlement_release_pending')
     or payment_record.refund_requested_at is not null
     or payment_record.gateway_transfer_id is null then
    raise exception 'PROPERTY_ADVANCE_COMPLETION_STATE_CONFLICT'
      using errcode = '55000';
  end if;

  if confirmed_at is null then
    if confirmation_column = 'buyer_completion_confirmed_at' then
      update public.property_unit_booking_advance_payments
      set buyer_completion_confirmed_at = now(), updated_at = now()
      where id = payment_record.id
      returning * into payment_record;

      insert into public.property_unit_booking_advance_payment_events (
        payment_id, advance_request_id, application_id, unit_id,
        actor_user_id, event_kind, metadata
      ) values (
        payment_record.id, payment_record.advance_request_id,
        payment_record.application_id, payment_record.unit_id,
        target_actor_user_id, 'buyer_completion_confirmed', '{}'::jsonb
      );
    else
      update public.property_unit_booking_advance_payments
      set owner_completion_confirmed_at = now(), updated_at = now()
      where id = payment_record.id
      returning * into payment_record;

      insert into public.property_unit_booking_advance_payment_events (
        payment_id, advance_request_id, application_id, unit_id,
        actor_user_id, event_kind, metadata
      ) values (
        payment_record.id, payment_record.advance_request_id,
        payment_record.application_id, payment_record.unit_id,
        target_actor_user_id, 'owner_completion_confirmed', '{}'::jsonb
      );
    end if;
  end if;

  return jsonb_build_object(
    'status', payment_record.status,
    'buyerCompletionConfirmedAt', payment_record.buyer_completion_confirmed_at,
    'ownerCompletionConfirmedAt', payment_record.owner_completion_confirmed_at,
    'readyToRelease',
      payment_record.buyer_completion_confirmed_at is not null
      and payment_record.owner_completion_confirmed_at is not null,
    'gatewayTransferId', payment_record.gateway_transfer_id,
    'sellerLinkedAccountId', payment_record.seller_linked_account_id,
    'amountPaise', payment_record.amount_paise,
    'currency', payment_record.currency,
    'gatewayMode', payment_record.gateway_mode
  );
end;
$$;

create or replace function
  public.prepare_property_advance_settlement_release(
    target_payment_id uuid
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

  if payment_record.status = 'settled' then
    return jsonb_build_object('status', 'settled');
  end if;

  if payment_record.status = 'paid_held' then
    if payment_record.buyer_completion_confirmed_at is null
       or payment_record.owner_completion_confirmed_at is null
       or payment_record.gateway_transfer_id is null
       or payment_record.refund_requested_at is not null then
      raise exception 'PROPERTY_ADVANCE_SETTLEMENT_STATE_CONFLICT'
        using errcode = '55000';
    end if;

    update public.property_unit_booking_advance_payments
    set
      status = 'settlement_release_pending',
      settlement_release_requested_at = now(),
      updated_at = now()
    where id = payment_record.id
    returning * into payment_record;

    insert into public.property_unit_booking_advance_payment_events (
      payment_id, advance_request_id, application_id, unit_id,
      actor_user_id, event_kind, metadata
    ) values (
      payment_record.id, payment_record.advance_request_id,
      payment_record.application_id, payment_record.unit_id,
      null, 'settlement_release_requested',
      jsonb_build_object('transferId', payment_record.gateway_transfer_id)
    );
  elsif payment_record.status <> 'settlement_release_pending'
     or payment_record.buyer_completion_confirmed_at is null
     or payment_record.owner_completion_confirmed_at is null
     or payment_record.refund_requested_at is not null then
    raise exception 'PROPERTY_ADVANCE_SETTLEMENT_STATE_CONFLICT'
      using errcode = '55000';
  end if;

  return jsonb_build_object(
    'status', payment_record.status,
    'gatewayTransferId', payment_record.gateway_transfer_id,
    'sellerLinkedAccountId', payment_record.seller_linked_account_id,
    'amountPaise', payment_record.amount_paise,
    'currency', payment_record.currency,
    'gatewayMode', payment_record.gateway_mode
  );
end;
$$;

create or replace function
  public.record_property_advance_settled(
    target_payment_id uuid,
    target_gateway_transfer_id text,
    target_recipient_settlement_id text,
    target_settlement_status text
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

  if payment_record.status = 'settled'
     and payment_record.gateway_transfer_id = target_gateway_transfer_id then
    return jsonb_build_object('status', 'settled');
  end if;

  if payment_record.status <> 'settlement_release_pending'
     or payment_record.gateway_transfer_id is distinct from target_gateway_transfer_id
     or target_settlement_status is distinct from 'settled'
     or nullif(btrim(target_recipient_settlement_id), '') is null
     or payment_record.buyer_completion_confirmed_at is null
     or payment_record.owner_completion_confirmed_at is null
     or payment_record.refund_requested_at is not null then
    raise exception 'PROPERTY_ADVANCE_SETTLEMENT_STATE_CONFLICT'
      using errcode = '55000';
  end if;

  update public.property_unit_booking_advance_payments
  set
    status = 'settled',
    settlement_released_at = coalesce(settlement_released_at, now()),
    settled_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'recipientSettlementId', target_recipient_settlement_id,
        'settlementStatus', target_settlement_status
      ),
    updated_at = now()
  where id = payment_record.id
  returning * into payment_record;

  insert into public.property_unit_booking_advance_payment_events (
    payment_id, advance_request_id, application_id, unit_id,
    actor_user_id, event_kind, metadata
  ) values (
    payment_record.id, payment_record.advance_request_id,
    payment_record.application_id, payment_record.unit_id,
    null, 'settled',
    jsonb_build_object(
      'transferId', target_gateway_transfer_id,
      'recipientSettlementId', target_recipient_settlement_id
    )
  );

  return jsonb_build_object('status', 'settled');
end;
$$;

revoke all on function
  public.confirm_property_advance_deal_completion(uuid, uuid)
from public, anon, authenticated;
grant execute on function
  public.confirm_property_advance_deal_completion(uuid, uuid)
to service_role;

revoke all on function
  public.prepare_property_advance_settlement_release(uuid)
from public, anon, authenticated;
grant execute on function
  public.prepare_property_advance_settlement_release(uuid)
to service_role;

revoke all on function
  public.record_property_advance_settled(uuid, text, text, text)
from public, anon, authenticated;
grant execute on function
  public.record_property_advance_settled(uuid, text, text, text)
to service_role;

commit;
