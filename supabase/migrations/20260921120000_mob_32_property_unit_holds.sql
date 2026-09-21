begin;

/*
 * MOB-32 — Private property-unit hold and booking-intent authority.
 *
 * This ledger is deliberately separate from material inventory reservations.
 * Acquisition and release must be performed through service-role server
 * authority. The native client receives only the safe mobile projection.
 *
 * A hold:
 * - is bound to one verified property unit;
 * - is bound to one buyer and the canonical owner;
 * - requires a granted, unexpired MOB-31 legal-review request;
 * - represents booking intent only;
 * - creates no payment, agreement or transfer of ownership;
 * - expires automatically after a short period.
 */

create table if not exists public.property_unit_booking_holds (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null,
  project_id uuid not null,
  buyer_user_id uuid not null
    references auth.users(id) on delete restrict,
  owner_user_id uuid not null
    references auth.users(id) on delete restrict,
  legal_review_request_id uuid not null
    references public.property_unit_legal_review_requests(id)
    on delete restrict,
  status text not null default 'active'
    check (
      status in (
        'active',
        'cancelled',
        'expired',
        'converted'
      )
    ),
  intent_version text not null,
  buyer_acknowledged_at timestamptz not null,
  held_at timestamptz not null default now(),
  expires_at timestamptz not null,
  cancelled_at timestamptz,
  converted_at timestamptz,
  released_at timestamptz,
  cancellation_reason text,
  conversion_reference_type text,
  conversion_reference_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_unit_booking_holds_project_unit_fk
    foreign key (project_id, unit_id)
    references public.builder_inventory_units(project_id, id)
    on delete restrict,
  constraint property_unit_booking_holds_distinct_parties_check
    check (buyer_user_id <> owner_user_id),
  constraint property_unit_booking_holds_expiry_check
    check (
      expires_at > held_at
      and expires_at <= held_at + interval '30 minutes'
    ),
  constraint property_unit_booking_holds_acknowledgement_check
    check (
      buyer_acknowledged_at <= held_at + interval '1 minute'
    ),
  constraint property_unit_booking_holds_terminal_state_check
    check (
      (
        status = 'active'
        and cancelled_at is null
        and converted_at is null
        and released_at is null
      )
      or (
        status = 'cancelled'
        and cancelled_at is not null
        and converted_at is null
        and released_at is not null
      )
      or (
        status = 'expired'
        and cancelled_at is null
        and converted_at is null
        and released_at is not null
      )
      or (
        status = 'converted'
        and cancelled_at is null
        and converted_at is not null
        and released_at is not null
        and conversion_reference_type is not null
        and conversion_reference_id is not null
      )
    )
);

create unique index if not exists
  property_unit_booking_holds_one_active_unit_uk
on public.property_unit_booking_holds (unit_id)
where status = 'active';

create unique index if not exists
  property_unit_booking_holds_one_active_buyer_unit_uk
on public.property_unit_booking_holds (buyer_user_id, unit_id)
where status = 'active';

create index if not exists
  property_unit_booking_holds_buyer_created_idx
on public.property_unit_booking_holds
  (buyer_user_id, created_at desc);

create index if not exists
  property_unit_booking_holds_owner_created_idx
on public.property_unit_booking_holds
  (owner_user_id, created_at desc);

create index if not exists
  property_unit_booking_holds_active_expiry_idx
on public.property_unit_booking_holds (expires_at)
where status = 'active';

create table if not exists public.property_unit_booking_hold_events (
  id uuid primary key default gen_random_uuid(),
  hold_id uuid not null
    references public.property_unit_booking_holds(id)
    on delete restrict,
  unit_id uuid not null,
  project_id uuid not null,
  buyer_user_id uuid not null
    references auth.users(id) on delete restrict,
  owner_user_id uuid not null
    references auth.users(id) on delete restrict,
  actor_user_id uuid
    references auth.users(id) on delete set null,
  event_kind text not null
    check (
      event_kind in (
        'hold_created',
        'hold_cancelled',
        'hold_expired',
        'hold_converted'
      )
    ),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint property_unit_booking_hold_events_project_unit_fk
    foreign key (project_id, unit_id)
    references public.builder_inventory_units(project_id, id)
    on delete restrict
);

create index if not exists
  property_unit_booking_hold_events_hold_created_idx
on public.property_unit_booking_hold_events
  (hold_id, created_at);

create index if not exists
  property_unit_booking_hold_events_unit_created_idx
on public.property_unit_booking_hold_events
  (unit_id, created_at desc);

alter table public.property_unit_booking_holds
  enable row level security;

alter table public.property_unit_booking_hold_events
  enable row level security;

revoke all on public.property_unit_booking_holds
  from public, anon, authenticated;

revoke all on public.property_unit_booking_hold_events
  from public, anon, authenticated;

grant select, insert, update
  on public.property_unit_booking_holds
  to service_role;

grant select, insert
  on public.property_unit_booking_hold_events
  to service_role;

comment on table public.property_unit_booking_holds is
  'Private short-lived booking intent for a verified property unit. It is not a payment, booking confirmation, agreement or ownership transfer.';

comment on table public.property_unit_booking_hold_events is
  'Append-only audit history for creation, cancellation, expiry and conversion of private property-unit holds.';

comment on column public.property_unit_booking_holds.legal_review_request_id is
  'Canonical MOB-31 legal-review grant used to authorize the booking intent.';

comment on column public.property_unit_booking_holds.intent_version is
  'Version of the buyer acknowledgement shown before acquiring the hold.';

commit;
