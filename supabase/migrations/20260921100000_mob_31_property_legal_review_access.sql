begin;

/*
 * MOB-31 — Confidential buyer legal-review authority.
 *
 * Privacy rules:
 * - private legal papers remain in property-documents-private;
 * - buyers receive no direct table or storage access;
 * - a buyer must explicitly consent and request access for one unit;
 * - the project owner must grant that exact request;
 * - every grant expires and may be revoked;
 * - every state change and document view is recorded append-only;
 * - signed URLs are created only by authenticated server routes and are
 *   never persisted in either table.
 */

create table if not exists public.property_unit_legal_review_requests (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null
    references public.builder_inventory_units(id) on delete cascade,
  project_id uuid not null
    references public.builder_projects(id) on delete cascade,
  buyer_user_id uuid not null
    references auth.users(id) on delete cascade,
  owner_user_id uuid not null
    references auth.users(id) on delete cascade,
  status text not null default 'requested'
    check (
      status in (
        'requested',
        'granted',
        'declined',
        'revoked',
        'expired'
      )
    ),
  purpose text not null
    check (length(btrim(purpose)) between 10 and 500),
  consent_version text not null
    check (length(btrim(consent_version)) between 1 and 80),
  buyer_consent_at timestamptz not null,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decision_note text
    check (decision_note is null or length(btrim(decision_note)) <= 500),
  decided_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_legal_review_project_unit_fk
    foreign key (project_id, unit_id)
    references public.builder_inventory_units(project_id, id)
    on delete cascade,
  constraint property_legal_review_distinct_parties_check
    check (buyer_user_id <> owner_user_id),
  constraint property_legal_review_consent_time_check
    check (buyer_consent_at <= requested_at),
  constraint property_legal_review_grant_fields_check
    check (
      status <> 'granted'
      or (
        decided_at is not null
        and decided_by is not null
        and expires_at is not null
        and expires_at > decided_at
      )
    ),
  constraint property_legal_review_revocation_fields_check
    check (
      status <> 'revoked'
      or (
        revoked_at is not null
        and revoked_by is not null
      )
    ),
  constraint property_legal_review_expiry_order_check
    check (
      expires_at is null
      or expires_at > requested_at
    )
);

create unique index if not exists
  property_unit_legal_review_one_active_request_uk
on public.property_unit_legal_review_requests (
  unit_id,
  buyer_user_id
)
where status in ('requested', 'granted');

create index if not exists
  property_unit_legal_review_buyer_created_idx
on public.property_unit_legal_review_requests (
  buyer_user_id,
  created_at desc
);

create index if not exists
  property_unit_legal_review_owner_created_idx
on public.property_unit_legal_review_requests (
  owner_user_id,
  created_at desc
);

create table if not exists public.property_legal_review_access_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.property_unit_legal_review_requests(id)
    on delete cascade,
  unit_id uuid not null
    references public.builder_inventory_units(id) on delete cascade,
  project_id uuid not null
    references public.builder_projects(id) on delete cascade,
  document_id uuid
    references public.property_project_legal_documents(id)
    on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_kind text not null
    check (
      event_kind in (
        'requested',
        'granted',
        'declined',
        'revoked',
        'expired',
        'document_viewed'
      )
    ),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint property_legal_review_event_document_check
    check (
      event_kind <> 'document_viewed'
      or document_id is not null
    ),
  constraint property_legal_review_event_project_unit_fk
    foreign key (project_id, unit_id)
    references public.builder_inventory_units(project_id, id)
    on delete cascade
);

create index if not exists
  property_legal_review_events_request_created_idx
on public.property_legal_review_access_events (
  request_id,
  created_at desc
);

alter table public.property_unit_legal_review_requests
  enable row level security;
alter table public.property_legal_review_access_events
  enable row level security;

revoke all on public.property_unit_legal_review_requests
  from public, anon, authenticated;
revoke all on public.property_legal_review_access_events
  from public, anon, authenticated;

grant select, insert, update, delete
  on public.property_unit_legal_review_requests
  to service_role;
grant select, insert
  on public.property_legal_review_access_events
  to service_role;

comment on table public.property_unit_legal_review_requests is
  'Server-controlled, unit-scoped buyer requests and owner grants for confidential property-paper review.';

comment on table public.property_legal_review_access_events is
  'Append-only audit trail for confidential legal-review state changes and document views. Signed URLs must never be stored here.';

commit;
