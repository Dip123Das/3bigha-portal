begin;

/*
 * MOB-33 — Private owner-reviewed property booking applications.
 *
 * This authority sits between the short-lived MOB-32 unit hold and any
 * future property-payment or agreement authority.
 *
 * An application:
 * - must originate from one buyer-owned active hold;
 * - remains private to the authenticated buyer and canonical owner;
 * - keeps the unit reserved while submitted or accepted;
 * - gives the owner 48 hours to decide;
 * - gives an accepted application a separate 48-hour next-step window;
 * - creates no payment, agreement, sale, title or ownership transfer;
 * - never stores gateway credentials or private legal-document paths.
 */

create table if not exists public.property_unit_booking_applications (
  id uuid primary key default gen_random_uuid(),
  hold_id uuid not null unique
    references public.property_unit_booking_holds(id)
    on delete restrict,
  unit_id uuid not null,
  project_id uuid not null,
  buyer_user_id uuid not null
    references auth.users(id) on delete restrict,
  owner_user_id uuid not null
    references auth.users(id) on delete restrict,
  legal_review_request_id uuid not null
    references public.property_unit_legal_review_requests(id)
    on delete restrict,
  status text not null default 'submitted'
    check (
      status in (
        'submitted',
        'accepted',
        'declined',
        'cancelled',
        'expired'
      )
    ),
  intent_version text not null,
  buyer_acknowledged_at timestamptz not null,
  buyer_message text,
  submitted_at timestamptz not null default now(),
  decision_due_at timestamptz not null,
  owner_decided_at timestamptz,
  owner_decision_note text,
  accepted_until timestamptz,
  cancelled_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_unit_booking_applications_project_unit_fk
    foreign key (project_id, unit_id)
    references public.builder_inventory_units(project_id, id)
    on delete restrict,
  constraint property_unit_booking_applications_distinct_parties_check
    check (buyer_user_id <> owner_user_id),
  constraint property_unit_booking_applications_message_check
    check (
      buyer_message is null
      or char_length(buyer_message) between 1 and 1000
    ),
  constraint property_unit_booking_applications_decision_note_check
    check (
      owner_decision_note is null
      or char_length(owner_decision_note) between 1 and 1000
    ),
  constraint property_unit_booking_applications_acknowledgement_check
    check (
      buyer_acknowledged_at <= submitted_at + interval '1 minute'
      and buyer_acknowledged_at >= submitted_at - interval '5 minutes'
    ),
  constraint property_unit_booking_applications_decision_window_check
    check (
      decision_due_at > submitted_at
      and decision_due_at <= submitted_at + interval '48 hours'
    ),
  constraint property_unit_booking_applications_acceptance_window_check
    check (
      accepted_until is null
      or (
        owner_decided_at is not null
        and accepted_until > owner_decided_at
        and accepted_until <= owner_decided_at + interval '48 hours'
      )
    ),
  constraint property_unit_booking_applications_state_check
    check (
      (
        status = 'submitted'
        and owner_decided_at is null
        and owner_decision_note is null
        and accepted_until is null
        and cancelled_at is null
        and ended_at is null
      )
      or (
        status = 'accepted'
        and owner_decided_at is not null
        and accepted_until is not null
        and cancelled_at is null
        and ended_at is null
      )
      or (
        status = 'declined'
        and owner_decided_at is not null
        and accepted_until is null
        and cancelled_at is null
        and ended_at is not null
      )
      or (
        status = 'cancelled'
        and accepted_until is null
        and cancelled_at is not null
        and ended_at is not null
      )
      or (
        status = 'expired'
        and accepted_until is null
        and cancelled_at is null
        and ended_at is not null
      )
    )
);

create unique index if not exists
  property_unit_booking_applications_one_active_unit_uk
on public.property_unit_booking_applications (unit_id)
where status in ('submitted', 'accepted');

create unique index if not exists
  property_unit_booking_applications_one_active_buyer_unit_uk
on public.property_unit_booking_applications (buyer_user_id, unit_id)
where status in ('submitted', 'accepted');

create index if not exists
  property_unit_booking_applications_buyer_created_idx
on public.property_unit_booking_applications
  (buyer_user_id, created_at desc);

create index if not exists
  property_unit_booking_applications_owner_status_idx
on public.property_unit_booking_applications
  (owner_user_id, status, created_at desc);

create index if not exists
  property_unit_booking_applications_submitted_expiry_idx
on public.property_unit_booking_applications (decision_due_at)
where status = 'submitted';

create index if not exists
  property_unit_booking_applications_accepted_expiry_idx
on public.property_unit_booking_applications (accepted_until)
where status = 'accepted';

create table if not exists public.property_unit_booking_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.property_unit_booking_applications(id)
    on delete restrict,
  unit_id uuid not null,
  project_id uuid not null,
  actor_user_id uuid
    references auth.users(id) on delete restrict,
  event_kind text not null
    check (
      event_kind in (
        'submitted',
        'accepted',
        'declined',
        'cancelled',
        'expired'
      )
    ),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint property_unit_booking_application_events_project_unit_fk
    foreign key (project_id, unit_id)
    references public.builder_inventory_units(project_id, id)
    on delete restrict
);

create index if not exists
  property_unit_booking_application_events_application_created_idx
on public.property_unit_booking_application_events
  (application_id, created_at desc);

create index if not exists
  property_unit_booking_application_events_unit_created_idx
on public.property_unit_booking_application_events
  (unit_id, created_at desc);

alter table public.property_unit_booking_applications
  enable row level security;

alter table public.property_unit_booking_application_events
  enable row level security;

revoke all on public.property_unit_booking_applications
  from public, anon, authenticated;

revoke all on public.property_unit_booking_application_events
  from public, anon, authenticated;

grant select, insert, update
  on public.property_unit_booking_applications
  to service_role;

grant select, insert
  on public.property_unit_booking_application_events
  to service_role;

comment on table public.property_unit_booking_applications is
  'Private owner-reviewed application created from one valid property-unit hold. Active rows preserve reserved inventory but create no payment, agreement, sale, title or ownership transfer.';

comment on table public.property_unit_booking_application_events is
  'Append-only private audit trail for property booking-application state changes. Payment credentials, signed URLs and private legal-document paths must never be stored here.';

comment on column public.property_unit_booking_applications.accepted_until is
  'Deadline for a future separately authorized next step. Acceptance alone creates no payment, agreement, sale, title or ownership transfer.';

commit;
