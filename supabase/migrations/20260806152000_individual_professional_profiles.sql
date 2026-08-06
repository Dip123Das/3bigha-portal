begin;

create table if not exists public.individual_professional_profiles (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  primary_skill_key text not null,
  secondary_skill_keys text[] not null default '{}',

  economic_mode text not null default 'self_working_individual'
    check (
      economic_mode in (
        'self_working_individual',
        'contractor',
        'business_operator'
      )
    ),

  work_preferences jsonb not null default '{}'::jsonb,

  years_experience integer
    check (
      years_experience is null
      or years_experience between 0 and 80
    ),

  availability_status text not null default 'available'
    check (
      availability_status in (
        'available',
        'partially_available',
        'currently_engaged',
        'not_available'
      )
    ),

  service_radius_km numeric(8,2)
    check (
      service_radius_km is null
      or service_radius_km between 0 and 5000
    ),

  service_area_json jsonb not null default '{}'::jsonb,

  worker_declaration_accepted boolean not null default false,
  worker_declaration_at timestamptz,

  contractor_risk_status text not null default 'not_detected'
    check (
      contractor_risk_status in (
        'not_detected',
        'review_required',
        'confirmed_contractor',
        'cleared'
      )
    ),

  verification_status text not null default 'incomplete'
    check (
      verification_status in (
        'incomplete',
        'pending_review',
        'verified',
        'needs_correction',
        'reclassified_as_business',
        'rejected'
      )
    ),

  work_evidence_json jsonb not null default '[]'::jsonb,
  reference_json jsonb not null default '[]'::jsonb,

  lifetime_free_eligible boolean not null default false,

  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  reclassification_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint individual_professional_worker_declaration_time
    check (
      worker_declaration_accepted = false
      or worker_declaration_at is not null
    ),

  constraint individual_professional_lifetime_free_guard
    check (
      lifetime_free_eligible = false
      or (
        economic_mode = 'self_working_individual'
        and worker_declaration_accepted = true
        and contractor_risk_status in ('not_detected', 'cleared')
      )
    )
);

comment on table public.individual_professional_profiles is
  'Canonical professional projection for self-working individual skilled professionals. This table does not replace profiles or canonical identity declarations.';

comment on column public.individual_professional_profiles.lifetime_free_eligible is
  'Constitutional lifetime-free eligibility for verified self-working individuals only; contractors and business operators are excluded.';

create index if not exists
  individual_professional_profiles_primary_skill_idx
on public.individual_professional_profiles(primary_skill_key);

create index if not exists
  individual_professional_profiles_verification_idx
on public.individual_professional_profiles(verification_status);

create index if not exists
  individual_professional_profiles_availability_idx
on public.individual_professional_profiles(availability_status);

create index if not exists
  individual_professional_profiles_lifetime_free_idx
on public.individual_professional_profiles(lifetime_free_eligible)
where lifetime_free_eligible = true;

create or replace function public.set_individual_professional_profile_updated_at()
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

drop trigger if exists
  set_individual_professional_profile_updated_at
on public.individual_professional_profiles;

create trigger set_individual_professional_profile_updated_at
before update on public.individual_professional_profiles
for each row
execute function public.set_individual_professional_profile_updated_at();

alter table public.individual_professional_profiles
  enable row level security;

revoke all
on public.individual_professional_profiles
from anon;

grant select, insert, update
on public.individual_professional_profiles
to authenticated;

drop policy if exists
  "Individuals can read own professional profile"
on public.individual_professional_profiles;

create policy
  "Individuals can read own professional profile"
on public.individual_professional_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists
  "Individuals can create own professional profile"
on public.individual_professional_profiles;

create policy
  "Individuals can create own professional profile"
on public.individual_professional_profiles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and economic_mode = 'self_working_individual'
  and lifetime_free_eligible = false
  and verification_status in ('incomplete', 'pending_review')
  and contractor_risk_status in ('not_detected', 'review_required')
);

drop policy if exists
  "Individuals can update own incomplete professional profile"
on public.individual_professional_profiles;

create policy
  "Individuals can update own incomplete professional profile"
on public.individual_professional_profiles
for update
to authenticated
using (
  auth.uid() = user_id
  and verification_status in (
    'incomplete',
    'pending_review',
    'needs_correction'
  )
)
with check (
  auth.uid() = user_id
  and economic_mode = 'self_working_individual'
  and lifetime_free_eligible = false
  and verification_status in (
    'incomplete',
    'pending_review',
    'needs_correction'
  )
  and contractor_risk_status in (
    'not_detected',
    'review_required'
  )
);

commit;
