begin;

/* MOB-49 — Read the canonical Razorpay Route advance ledger for advisory drafts. */

create or replace function
  public.read_property_unit_booking_agreement_razorpay_advance_snapshot(
    target_draft_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  draft_record public.property_unit_booking_agreement_drafts%rowtype;
  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;
  advance_record public.property_unit_booking_advance_requests%rowtype;
  payment_record public.property_unit_booking_advance_payments%rowtype;
  action_time timestamptz := clock_timestamp();
  captured_at timestamptz;
  refunded_at timestamptz;
  captured_amount_paise bigint := 0;
  refunded_amount_paise bigint := 0;
  net_paid_amount_paise bigint := 0;
  payment_status text := 'not_linked';
begin
  if target_draft_id is null then
    raise exception 'AGREEMENT_DRAFT_ID_INVALID'
      using errcode = '22023';
  end if;

  select draft.*
  into draft_record
  from public.property_unit_booking_agreement_drafts draft
  where draft.id = target_draft_id;

  if not found
     or draft_record.status <> 'generation_pending'
     or draft_record.generation_started_at is null then
    raise exception 'AGREEMENT_GENERATION_CLAIM_REQUIRED'
      using errcode = '55000';
  end if;

  select readiness.*
  into readiness_record
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = draft_record.readiness_id;

  if not found
     or readiness_record.application_id <> draft_record.application_id
     or readiness_record.unit_id <> draft_record.unit_id
     or readiness_record.project_id <> draft_record.project_id then
    raise exception 'AGREEMENT_PAYMENT_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if readiness_record.advance_request_id is null then
    return jsonb_build_object(
      'currency', 'INR',
      'advanceRequestStatus', null,
      'proposedAdvanceAmountPaise', null,
      'paymentStatus', 'not_linked',
      'capturedAmountPaise', 0,
      'refundedAmountPaise', 0,
      'netPaidAmountPaise', 0,
      'capturedAt', null,
      'refundedAt', null,
      'snapshotAt', action_time
    );
  end if;

  select advance_request.*
  into advance_record
  from public.property_unit_booking_advance_requests advance_request
  where advance_request.id = readiness_record.advance_request_id;

  if not found
     or advance_record.application_id <> readiness_record.application_id
     or advance_record.hold_id <> readiness_record.hold_id
     or advance_record.unit_id <> readiness_record.unit_id
     or advance_record.project_id <> readiness_record.project_id
     or advance_record.buyer_user_id <> readiness_record.buyer_user_id
     or advance_record.owner_user_id <> readiness_record.owner_user_id then
    raise exception 'AGREEMENT_PAYMENT_BINDING_INVALID'
      using errcode = '23514';
  end if;

  select payment.*
  into payment_record
  from public.property_unit_booking_advance_payments payment
  where payment.advance_request_id = advance_record.id;

  if not found then
    payment_status := 'record_unavailable';
  else
    if payment_record.application_id <> readiness_record.application_id
       or payment_record.hold_id <> readiness_record.hold_id
       or payment_record.unit_id <> readiness_record.unit_id
       or payment_record.project_id <> readiness_record.project_id
       or payment_record.buyer_user_id <> readiness_record.buyer_user_id
       or payment_record.owner_user_id <> readiness_record.owner_user_id
       or payment_record.provider <> 'razorpay_route'
       or payment_record.currency <> 'INR'
       or payment_record.amount_paise
         <> advance_record.advance_amount_paise then
      raise exception 'AGREEMENT_PAYMENT_BINDING_INVALID'
        using errcode = '23514';
    end if;

    payment_status := payment_record.status;
    captured_at := payment_record.paid_at;
    refunded_at := payment_record.refunded_at;

    if payment_record.status in (
      'paid_held',
      'refund_pending',
      'refunded',
      'settlement_release_pending',
      'settled'
    ) then
      captured_amount_paise := payment_record.amount_paise;
    end if;

    if payment_record.status = 'refunded'
       and payment_record.refunded_at is not null then
      refunded_amount_paise := payment_record.refund_amount_paise;
    end if;

    net_paid_amount_paise := greatest(
      0,
      captured_amount_paise - refunded_amount_paise
    );
  end if;

  return jsonb_build_object(
    'currency', 'INR',
    'advanceRequestStatus', advance_record.status,
    'proposedAdvanceAmountPaise', advance_record.advance_amount_paise,
    'paymentStatus', payment_status,
    'capturedAmountPaise', captured_amount_paise,
    'refundedAmountPaise', refunded_amount_paise,
    'netPaidAmountPaise', net_paid_amount_paise,
    'capturedAt', captured_at,
    'refundedAt', refunded_at,
    'snapshotAt', action_time
  );
end;
$$;

revoke all on function
  public.read_property_unit_booking_agreement_razorpay_advance_snapshot(uuid)
from public, anon, authenticated;
grant execute on function
  public.read_property_unit_booking_agreement_razorpay_advance_snapshot(uuid)
to service_role;

comment on function
  public.read_property_unit_booking_agreement_razorpay_advance_snapshot(uuid)
is
  'Returns a binding-checked, server-side Razorpay Route advance ledger snapshot for a claimed private agreement draft. Excludes all gateway identifiers and does not create or change payments.';

commit;
