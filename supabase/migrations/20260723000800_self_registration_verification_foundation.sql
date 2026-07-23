begin;

alter table public.profiles
  add column if not exists registration_verification_status text
    not null default 'draft',
  add column if not exists registration_verification_score integer
    not null default 0,
  add column if not exists registration_verification_reasons jsonb
    not null default '[]'::jsonb,
  add column if not exists registration_verified_at timestamptz,
  add column if not exists registration_verification_source text,
  add column if not exists dashboard_activation_status text
    not null default 'not_ready',
  add column if not exists dashboard_activated_at timestamptz,
  add column if not exists admin_review_reason text;

alter table public.business_profiles
  add column if not exists selfie_capture_status text
    not null default 'missing',
  add column if not exists selfie_media_json jsonb,
  add column if not exists workplace_evidence_status text
    not null default 'missing',
  add column if not exists workplace_media_json jsonb
    not null default '[]'::jsonb,
  add column if not exists business_description text,
  add column if not exists automated_verification_json jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_registration_verification_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_registration_verification_status_check
      check (
        registration_verification_status in (
          'draft',
          'evidence_incomplete',
          'automated_verification_pending',
          'correction_required',
          'admin_review_required',
          'auto_verified',
          'admin_verified',
          'restricted'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_dashboard_activation_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_dashboard_activation_status_check
      check (
        dashboard_activation_status in (
          'not_ready',
          'ready',
          'active',
          'suspended'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_profiles_selfie_capture_status_check'
  ) then
    alter table public.business_profiles
      add constraint business_profiles_selfie_capture_status_check
      check (
        selfie_capture_status in (
          'missing',
          'captured',
          'verification_pending',
          'verified',
          'correction_required',
          'admin_review_required'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_profiles_workplace_evidence_status_check'
  ) then
    alter table public.business_profiles
      add constraint business_profiles_workplace_evidence_status_check
      check (
        workplace_evidence_status in (
          'missing',
          'submitted',
          'verification_pending',
          'verified',
          'correction_required',
          'admin_review_required',
          'not_required'
        )
      );
  end if;
end
$$;

create table if not exists public.registration_verification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  previous_status text,
  next_status text not null,
  score integer,
  reasons jsonb not null default '[]'::jsonb,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  decision_source text not null default 'system',
  decided_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists
  registration_verification_events_user_created_idx
on public.registration_verification_events(user_id, created_at desc);

alter table public.registration_verification_events
  enable row level security;

drop policy if exists
  registration_verification_events_member_read
on public.registration_verification_events;

create policy registration_verification_events_member_read
on public.registration_verification_events
for select
to authenticated
using (user_id = auth.uid());

comment on column public.profiles.registration_verification_status is
  'Canonical self-registration verification state. Manual administration is an exception path only.';

comment on column public.profiles.approval_status is
  'Compatibility projection for existing marketplace and access checks. It must be derived from registration verification, not treated as the primary workflow.';

commit;
