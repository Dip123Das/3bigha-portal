begin;

/*
 * MOB-41 — Isolated Razorpay Route ledger for property booking advances.
 * This ledger is separate from commercial subscription/add-on orders.
 * A held Route transfer is not escrow and does not transfer property title.
 */

create table if not exists
  public.property_unit_booking_advance_payments (
    id uuid primary key default gen_random_uuid(),

    advance_request_id uuid not null unique
      references public.property_unit_booking_advance_requests(id)
      on delete restrict,
    application_id uuid not null
      references public.property_unit_booking_applications(id)
      on delete restrict,
    hold_id uuid not null
      references public.property_unit_booking_holds(id)
      on delete restrict,
    unit_id uuid not null
      references public.builder_inventory_units(id)
      on delete restrict,
    project_id uuid not null
      references public.builder_projects(id)
      on delete restrict,
    buyer_user_id uuid not null
      references auth.users(id) on delete restrict,
    owner_user_id uuid not null
      references auth.users(id) on delete restrict,

    provider text not null default 'razorpay_route'
      check (provider = 'razorpay_route'),
    gateway_mode text not null
      check (gateway_mode in ('test', 'live')),
    currency text not null default 'INR'
      check (currency = 'INR'),
    amount_paise bigint not null check (amount_paise > 0),
    seller_linked_account_id text not null,

    idempotency_key uuid not null,
    order_creation_attempt uuid,
    order_creation_started_at timestamptz,
    gateway_order_id text unique,
    gateway_payment_id text unique,
    gateway_transfer_id text unique,
    gateway_refund_id text unique,

    status text not null default 'order_preparing'
      check (status in (
        'order_preparing',
        'payment_pending',
        'paid_held',
        'refund_pending',
        'refunded',
        'settlement_release_pending',
        'settled',
        'failed',
        'review_required'
      )),

    paid_at timestamptz,
    refund_amount_paise bigint not null default 0
      check (refund_amount_paise >= 0),
    refund_requested_at timestamptz,
    refunded_at timestamptz,
    transfer_reversal_status text not null default 'not_required'
      check (transfer_reversal_status in (
        'not_required',
        'pending',
        'reversed',
        'review_required'
      )),
    buyer_completion_confirmed_at timestamptz,
    owner_completion_confirmed_at timestamptz,
    settlement_release_requested_at timestamptz,
    settlement_released_at timestamptz,
    settled_at timestamptz,

    failure_code text,
    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint property_advance_payment_distinct_parties check (
      buyer_user_id <> owner_user_id
    ),

    constraint property_advance_payment_seller_account_reference check (
      char_length(btrim(seller_linked_account_id)) between 1 and 128
    ),

    constraint property_advance_payment_idempotency_unique
      unique (buyer_user_id, idempotency_key),

    constraint property_advance_payment_attempt_pair check (
      (order_creation_attempt is null) =
      (order_creation_started_at is null)
    ),

    constraint property_advance_payment_paid_state check (
      status not in (
        'paid_held',
        'refund_pending',
        'refunded',
        'settlement_release_pending',
        'settled'
      )
      or (
        gateway_order_id is not null
        and gateway_payment_id is not null
        and paid_at is not null
      )
    ),

    constraint property_advance_payment_refund_state check (
      status not in ('refund_pending', 'refunded')
      or (
        refund_amount_paise = amount_paise
        and refund_requested_at is not null
      )
    ),

    constraint property_advance_payment_refunded_state check (
      status <> 'refunded'
      or (
        gateway_refund_id is not null
        and refunded_at is not null
        and transfer_reversal_status in ('not_required', 'reversed')
      )
    ),

    constraint property_advance_payment_settlement_state check (
      status not in ('settlement_release_pending', 'settled')
      or (
        gateway_transfer_id is not null
        and buyer_completion_confirmed_at is not null
        and owner_completion_confirmed_at is not null
        and settlement_release_requested_at is not null
      )
    ),

    constraint property_advance_payment_settled_state check (
      status <> 'settled' or settlement_released_at is not null
    ),

    constraint property_advance_payment_settlement_refund_exclusion check (
      not (
        status = 'settled'
        and refund_requested_at is not null
      )
      and not (
        status = 'refunded'
        and settled_at is not null
      )
    ),

    constraint property_advance_payment_failure_code_length check (
      failure_code is null or char_length(failure_code) <= 120
    )
  );

create index if not exists
  property_advance_payment_buyer_created_idx
on public.property_unit_booking_advance_payments(
  buyer_user_id,
  created_at desc
);

create index if not exists
  property_advance_payment_owner_created_idx
on public.property_unit_booking_advance_payments(
  owner_user_id,
  created_at desc
);

create index if not exists
  property_advance_payment_status_updated_idx
on public.property_unit_booking_advance_payments(status, updated_at);

create table if not exists
  public.property_unit_booking_advance_payment_events (
    id uuid primary key default gen_random_uuid(),
    payment_id uuid not null
      references public.property_unit_booking_advance_payments(id)
      on delete restrict,
    advance_request_id uuid not null
      references public.property_unit_booking_advance_requests(id)
      on delete restrict,
    application_id uuid not null
      references public.property_unit_booking_applications(id)
      on delete restrict,
    unit_id uuid not null
      references public.builder_inventory_units(id)
      on delete restrict,
    actor_user_id uuid
      references auth.users(id) on delete restrict,
    event_kind text not null check (event_kind in (
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
    )),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

create index if not exists
  property_advance_payment_events_payment_created_idx
on public.property_unit_booking_advance_payment_events(
  payment_id,
  created_at
);

alter table public.property_unit_booking_advance_payments
  enable row level security;

alter table public.property_unit_booking_advance_payment_events
  enable row level security;

revoke all on table
  public.property_unit_booking_advance_payments
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.property_unit_booking_advance_payments
to service_role;

revoke all on table
  public.property_unit_booking_advance_payment_events
from public, anon, authenticated;

grant select, insert on table
  public.property_unit_booking_advance_payment_events
to service_role;

comment on table public.property_unit_booking_advance_payments is
  'Razorpay Route property advance ledger. Platform commercial subscriptions and add-ons use a separate ledger. A held transfer is not escrow or a title/ownership transfer.';

comment on table public.property_unit_booking_advance_payment_events is
  'Append-only server audit events for property advance payment, full refunds, both-party completion confirmations and held seller settlement.';

commit;
