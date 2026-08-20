begin;

create table if not exists public.registration_cross_verification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid null references public.registration_verification_cases(id) on delete set null,
  document_intelligence_id uuid not null
    references public.registration_document_intelligence(id) on delete cascade,
  evidence_sha256 text not null,
  overall_consistency integer not null default 0
    check (overall_consistency between 0 and 100),
  identity_consistency integer not null default 0
    check (identity_consistency between 0 and 100),
  business_consistency integer not null default 0
    check (business_consistency between 0 and 100),
  geographic_consistency integer not null default 0
    check (geographic_consistency between 0 and 100),
  identifier_consistency integer not null default 0
    check (identifier_consistency between 0 and 100),
  field_comparisons jsonb not null default '[]'::jsonb,
  matched_fields jsonb not null default '[]'::jsonb,
  mismatched_fields jsonb not null default '[]'::jsonb,
  missing_fields jsonb not null default '[]'::jsonb,
  duplicate_identifiers jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  recommended_action text not null default 'manual_review'
    check (
      recommended_action in (
        'consistent',
        'request_correction',
        'manual_review'
      )
    ),
  status text not null default 'completed'
    check (status in ('completed', 'needs_manual_review')),
  source text not null default 'registration_cross_verification_v1',
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_intelligence_id)
);

create index if not exists
  registration_cross_verification_user_created_idx
on public.registration_cross_verification(user_id, created_at desc);

create index if not exists
  registration_cross_verification_case_idx
on public.registration_cross_verification(case_id);

alter table public.registration_cross_verification
  enable row level security;

drop policy if exists
  "Master admins can read cross verification"
on public.registration_cross_verification;

create policy
  "Master admins can read cross verification"
on public.registration_cross_verification
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles reviewer
    where reviewer.id = auth.uid()
      and reviewer.role = 'master_admin'
  )
);

revoke all on public.registration_cross_verification
from anon;

grant select on public.registration_cross_verification
to authenticated;

grant all on public.registration_cross_verification
to service_role;

commit;
