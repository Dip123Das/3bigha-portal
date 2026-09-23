begin;

/*
 * MOB-34 — Private property-booking advance readiness.
 *
 * This schema records an owner-proposed, server-priced advance quote for one
 * accepted property booking application. It is deliberately isolated from
 * subscription payments.
 *
 * Creating a row:
 * - does not create an SBI gateway order;
 * - does not prove or collect payment;
 * - does not create an agreement;
 * - does not mark inventory sold;
 * - does not transfer title or ownership.
 *
 * Only later service-role authorities may mutate this lifecycle.
 */

create table if not exists public.property_unit_booking_advance_requests (
  id uuid primary key default gen_random_uuid(),

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
    references auth.users(id)
    on delete restrict,

  owner_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  provider text not null default 'sbi_payment_gateway'
    check (provider = 'sbi_payment_gateway'),

  currency text not null default 'INR'
    check (currency = 'INR'),

  quoted_property_price_paise bigint not null
    check (quoted_property_price_paise > 0),

  advance_amount_paise bigint not null
    check (
      advance_amount_paise > 0
      and advance_amount_paise <= quoted_property_price_paise
    ),

  pricing_source text not null default 'builder_inventory_pricing'
    check (pricing_source = 'builder_inventory_pricing'),

  pricing_snapshot_at timestamptz not null,

  owner_terms_note text,
  owner_proposed_at timestamptz not null default now(),

  buyer_consent_version text,
  buyer_consented_at timestamptz,

  status text not null default 'owner_proposed'
    check (status in (
      'owner_proposed',
      'buyer_confirmed',
      'gateway_configuration_pending',
      'gateway_order_created',
      'payment_pending',
      'paid',
      'failed',
      'expired',
      'cancelled',
      'review_required'
    )),

  gateway_request_reference text unique,
  gateway_transaction_id text unique,
  gateway_response_json jsonb,

  paid_at timestamptz,
  expires_at timestamptz not null,
  cancelled_at timestamptz,
  failure_code text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint property_advance_distinct_parties check (
    buyer_user_id <> owner_user_id
  ),

  constraint property_advance_note_length check (
    owner_terms_note is null
    or char_length(owner_terms_note) <= 1000
  ),

  constraint property_advance_failure_code_length check (
    failure_code is null
    or char_length(failure_code) <= 120
  ),

  constraint property_advance_future_expiry check (
    expires_at > owner_proposed_at
  ),

  constraint property_advance_buyer_consent_pair check (
    (
      buyer_consent_version is null
      and buyer_consented_at is null
    )
    or (
      nullif(btrim(buyer_consent_version), '') is not null
      and buyer_consented_at is not null
    )
  ),

  constraint property_advance_confirmed_requires_consent check (
    status = 'owner_proposed'
    or (
      nullif(btrim(buyer_consent_version), '') is not null
      and buyer_consented_at is not null
    )
  ),

  constraint property_advance_paid_requires_gateway_confirmation check (
    status <> 'paid'
    or (
      nullif(btrim(gateway_transaction_id), '') is not null
      and paid_at is not null
    )
  ),

  constraint property_advance_unpaid_has_no_paid_timestamp check (
    status = 'paid'
    or paid_at is null
  ),

  constraint property_advance_cancelled_timestamp check (
    status <> 'cancelled'
    or cancelled_at is not null
  ),

  constraint property_advance_gateway_reference_scope check (
    status not in (
      'gateway_order_created',
      'payment_pending',
      'paid',
      'failed',
      'review_required'
    )
    or nullif(btrim(gateway_request_reference), '') is not null
  )
);

create unique index if not exists
  property_booking_advance_one_request_per_application_idx
on public.property_unit_booking_advance_requests(application_id);

create index if not exists
  property_booking_advance_buyer_created_idx
on public.property_unit_booking_advance_requests(
  buyer_user_id,
  created_at desc
);

create index if not exists
  property_booking_advance_owner_created_idx
on public.property_unit_booking_advance_requests(
  owner_user_id,
  created_at desc
);

create index if not exists
  property_booking_advance_status_expiry_idx
on public.property_unit_booking_advance_requests(
  status,
  expires_at
);

create table if not exists
  public.property_unit_booking_advance_events (
    id uuid primary key default gen_random_uuid(),

    advance_request_id uuid not null
      references public.property_unit_booking_advance_requests(id)
      on delete restrict,

    application_id uuid not null
      references public.property_unit_booking_applications(id)
      on delete restrict,

    unit_id uuid not null
      references public.builder_inventory_units(id)
      on delete restrict,

    project_id uuid not null
      references public.builder_projects(id)
      on delete restrict,

    actor_user_id uuid
      references auth.users(id)
      on delete restrict,

    event_kind text not null
      check (event_kind in (
        'owner_proposed',
        'buyer_confirmed',
        'gateway_configuration_pending',
        'gateway_order_created',
        'payment_pending',
        'paid',
        'failed',
        'expired',
        'cancelled',
        'review_required'
      )),

    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

create index if not exists
  property_booking_advance_events_request_created_idx
on public.property_unit_booking_advance_events(
  advance_request_id,
  created_at
);

create index if not exists
  property_booking_advance_events_application_created_idx
on public.property_unit_booking_advance_events(
  application_id,
  created_at
);

alter table public.property_unit_booking_advance_requests
  enable row level security;

alter table public.property_unit_booking_advance_events
  enable row level security;

revoke all
  on public.property_unit_booking_advance_requests
  from public, anon, authenticated;

revoke all
  on public.property_unit_booking_advance_events
  from public, anon, authenticated;

grant all
  on public.property_unit_booking_advance_requests
  to service_role;

grant all
  on public.property_unit_booking_advance_events
  to service_role;

comment on table public.property_unit_booking_advance_requests is
  'Private server-priced property advance readiness record for one accepted booking application. It creates no gateway order, payment proof, agreement, sale, title or ownership transfer.';

comment on column
  public.property_unit_booking_advance_requests.quoted_property_price_paise is
  'Immutable server snapshot of builder_inventory_pricing.price_total converted to paise by a later canonical authority. Never accepted from an untrusted buyer request.';

comment on column
  public.property_unit_booking_advance_requests.advance_amount_paise is
  'Owner-proposed advance amount validated by a later canonical authority against the server-owned quoted property price.';

comment on column
  public.property_unit_booking_advance_requests.gateway_response_json is
  'Private trusted callback evidence. It must never be included in a mobile workspace response.';

comment on table public.property_unit_booking_advance_events is
  'Append-only private audit trail for advance-readiness transitions. Raw gateway payloads, secrets and private storage paths must never be stored here.';

commit;
