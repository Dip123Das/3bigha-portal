-- 3Bigha Trusted Listing Media Foundation
-- Additive and non-destructive.
-- Human First. AI Second. Evidence Always. Trust by Design.

create extension if not exists pgcrypto;

create table if not exists public.trusted_capture_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid null,
  listing_entity_type text not null,
  listing_entity_id uuid null,
  draft_token uuid null,
  evidence_policy_key text not null,
  nonce_hash text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz null,
  client_platform text null,
  app_version text null,
  device_session_id text null,
  requested_lat numeric null check (requested_lat is null or requested_lat between -90 and 90),
  requested_lng numeric null check (requested_lng is null or requested_lng between -180 and 180),
  requested_accuracy_m numeric null check (requested_accuracy_m is null or requested_accuracy_m >= 0),
  location_observed_at timestamptz null,
  integrity_status text not null default 'pending',
  risk_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trusted_capture_sessions_integrity_status_check
    check (integrity_status in (
      'pending',
      'accepted',
      'review_required',
      'rejected',
      'expired'
    ))
);

create index if not exists idx_trusted_capture_sessions_owner
  on public.trusted_capture_sessions(owner_user_id, created_at desc);

create index if not exists idx_trusted_capture_sessions_entity
  on public.trusted_capture_sessions(
    listing_entity_type,
    listing_entity_id,
    created_at desc
  );

create index if not exists idx_trusted_capture_sessions_draft
  on public.trusted_capture_sessions(draft_token, created_at desc);

create table if not exists public.listing_media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid null,
  listing_entity_type text not null,
  listing_entity_id uuid null,
  draft_token uuid null,
  bucket text not null,
  object_path text not null,
  public_derivative_path text null,
  media_kind text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  width integer null,
  height integer null,
  duration_ms integer null,
  sha256 text null,
  perceptual_hash text null,
  origin_type text not null,
  evidence_role text null,
  is_mandatory_evidence boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  capture_session_id uuid null references public.trusted_capture_sessions(id) on delete set null,
  captured_at_client timestamptz null,
  captured_at_server timestamptz null,
  gps_lat_private numeric null check (gps_lat_private is null or gps_lat_private between -90 and 90),
  gps_lng_private numeric null check (gps_lng_private is null or gps_lng_private between -180 and 180),
  gps_accuracy_m numeric null check (gps_accuracy_m is null or gps_accuracy_m >= 0),
  gps_altitude_m numeric null,
  gps_provider text null,
  gps_captured_at timestamptz null,
  location_public_precision text null,
  public_lat numeric null check (public_lat is null or public_lat between -90 and 90),
  public_lng numeric null check (public_lng is null or public_lng between -180 and 180),
  provenance_status text not null default 'pending',
  lifecycle_status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint listing_media_assets_media_kind_check
    check (media_kind in ('image', 'video', 'document')),
  constraint listing_media_assets_origin_type_check
    check (origin_type in (
      'trusted_native',
      'trusted_web',
      'camera_input_unverified',
      'gallery_upload',
      'legacy_unknown'
    )),
  constraint listing_media_assets_provenance_status_check
    check (provenance_status in (
      'pending',
      'verified',
      'review_required',
      'rejected',
      'legacy_unverified'
    )),
  constraint listing_media_assets_lifecycle_status_check
    check (lifecycle_status in (
      'capture_started',
      'uploaded',
      'finalised',
      'verification_pending',
      'verified',
      'review_required',
      'correction_required',
      'rejected',
      'superseded',
      'deleted'
    )),
  constraint listing_media_assets_unique_object
    unique (bucket, object_path)
);

create index if not exists idx_listing_media_assets_owner
  on public.listing_media_assets(owner_user_id, created_at desc);

create index if not exists idx_listing_media_assets_entity
  on public.listing_media_assets(
    listing_entity_type,
    listing_entity_id,
    sort_order,
    created_at
  );

create index if not exists idx_listing_media_assets_draft
  on public.listing_media_assets(
    draft_token,
    sort_order,
    created_at
  );

create index if not exists idx_listing_media_assets_capture_session
  on public.listing_media_assets(capture_session_id);

create index if not exists idx_listing_media_assets_hash
  on public.listing_media_assets(sha256)
  where sha256 is not null;

create table if not exists public.listing_media_verifications (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  listing_entity_type text not null,
  listing_entity_id uuid null,
  draft_token uuid null,
  verification_version integer not null default 1 check (verification_version > 0),
  policy_version text not null,
  input_fingerprint text not null,
  ai_provider text null,
  ai_model text null,
  ai_run_id text null,
  ai_confidence numeric null check (ai_confidence is null or ai_confidence between 0 and 1),
  ai_summary text null,
  observations jsonb not null default '[]'::jsonb,
  mismatch_dimensions jsonb not null default '[]'::jsonb,
  severity text not null default 'none',
  deterministic_decision text not null default 'pending',
  decision_reasons jsonb not null default '[]'::jsonb,
  requires_admin_review boolean not null default false,
  resolved_at timestamptz null,
  resolved_by uuid null references auth.users(id) on delete set null,
  resolution_type text null,
  created_at timestamptz not null default now(),
  constraint listing_media_verifications_severity_check
    check (severity in (
      'none',
      'minor',
      'moderate',
      'major',
      'critical'
    )),
  constraint listing_media_verifications_decision_check
    check (deterministic_decision in (
      'pending',
      'allow',
      'review_required',
      'correction_required',
      'reject',
      'overridden'
    ))
);

create index if not exists idx_listing_media_verifications_entity
  on public.listing_media_verifications(
    listing_entity_type,
    listing_entity_id,
    created_at desc
  );

create index if not exists idx_listing_media_verifications_draft
  on public.listing_media_verifications(
    draft_token,
    created_at desc
  );

create table if not exists public.listing_moderation_events (
  id uuid primary key default gen_random_uuid(),
  listing_entity_type text not null,
  listing_entity_id uuid null,
  draft_token uuid null,
  actor_user_id uuid null references auth.users(id) on delete set null,
  event_type text not null,
  from_status text null,
  to_status text null,
  reason_code text null,
  notes text null,
  related_verification_id uuid null references public.listing_media_verifications(id) on delete set null,
  event_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_listing_moderation_events_entity
  on public.listing_moderation_events(
    listing_entity_type,
    listing_entity_id,
    created_at desc
  );

alter table public.trusted_capture_sessions enable row level security;
alter table public.listing_media_assets enable row level security;
alter table public.listing_media_verifications enable row level security;
alter table public.listing_moderation_events enable row level security;

drop policy if exists trusted_capture_sessions_select_own
  on public.trusted_capture_sessions;

create policy trusted_capture_sessions_select_own
  on public.trusted_capture_sessions
  for select
  using (auth.uid() = owner_user_id);

drop policy if exists trusted_capture_sessions_insert_own
  on public.trusted_capture_sessions;

create policy trusted_capture_sessions_insert_own
  on public.trusted_capture_sessions
  for insert
  with check (auth.uid() = owner_user_id);

drop policy if exists listing_media_assets_select_own
  on public.listing_media_assets;

create policy listing_media_assets_select_own
  on public.listing_media_assets
  for select
  using (auth.uid() = owner_user_id);

drop policy if exists listing_media_assets_insert_own
  on public.listing_media_assets;

create policy listing_media_assets_insert_own
  on public.listing_media_assets
  for insert
  with check (auth.uid() = owner_user_id);

drop policy if exists listing_media_assets_update_own
  on public.listing_media_assets;

-- Trusted provenance, private GPS, hashes and lifecycle decisions must not be
-- directly editable from the browser. Updates are performed by authenticated
-- server routes using the service role after ownership checks.

drop policy if exists listing_media_verifications_select_own
  on public.listing_media_verifications;

create policy listing_media_verifications_select_own
  on public.listing_media_verifications
  for select
  using (auth.uid() = owner_user_id);

-- No direct client insert/update policies for verifications.
-- Verification writes must use trusted server-side service-role code.

drop policy if exists listing_moderation_events_select_actor
  on public.listing_moderation_events;

create policy listing_moderation_events_select_actor
  on public.listing_moderation_events
  for select
  using (auth.uid() = actor_user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'listing-evidence-private',
  'listing-evidence-private',
  false,
  8388608,
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists listing_evidence_private_insert_own
  on storage.objects;

create policy listing_evidence_private_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-evidence-private'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists listing_evidence_private_select_own
  on storage.objects;

create policy listing_evidence_private_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'listing-evidence-private'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No authenticated UPDATE or DELETE policy is intentionally provided.
-- Retakes create new immutable evidence objects. Superseding, retention and
-- cleanup are performed through authenticated server-side service-role flows
-- with ownership checks and moderation audit events.

create or replace function public.set_trusted_media_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_trusted_capture_sessions_updated_at
  on public.trusted_capture_sessions;

create trigger trg_trusted_capture_sessions_updated_at
before update on public.trusted_capture_sessions
for each row
execute function public.set_trusted_media_updated_at();

drop trigger if exists trg_listing_media_assets_updated_at
  on public.listing_media_assets;

create trigger trg_listing_media_assets_updated_at
before update on public.listing_media_assets
for each row
execute function public.set_trusted_media_updated_at();

create unique index if not exists uq_listing_media_verification_fingerprint
  on public.listing_media_verifications(
    owner_user_id,
    listing_entity_type,
    input_fingerprint,
    verification_version
  );

create index if not exists idx_listing_media_assets_gate_lookup
  on public.listing_media_assets(
    owner_user_id,
    listing_entity_type,
    listing_entity_id,
    draft_token,
    is_mandatory_evidence,
    provenance_status,
    lifecycle_status
  )
  where deleted_at is null;

create index if not exists idx_listing_media_verifications_decision
  on public.listing_media_verifications(
    deterministic_decision,
    requires_admin_review,
    created_at desc
  );

comment on table public.trusted_capture_sessions is
  'Server-controlled capture sessions for GPS-backed live listing evidence.';

comment on table public.listing_media_assets is
  'Normalized media records for listing gallery assets and trusted evidence.';

comment on table public.listing_media_verifications is
  'Versioned AI observations plus deterministic trusted-media decisions.';

comment on table public.listing_moderation_events is
  'Append-only moderation and trusted-media decision audit events.';
