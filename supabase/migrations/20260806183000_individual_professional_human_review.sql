begin;

create table if not exists public.individual_professional_review_history (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  reviewer_id uuid not null
    references auth.users(id),

  decision text not null
    check (
      decision in (
        'approved_lifetime_free',
        'correction_requested',
        'rejected_misuse',
        'reclassified_as_business'
      )
    ),

  previous_verification_status text,
  next_verification_status text not null,

  previous_decision_status text,
  next_decision_status text not null,

  previous_contractor_risk_status text,
  next_contractor_risk_status text not null,

  reason text not null
    check (length(trim(reason)) >= 8),

  reviewer_notes text,

  ai_snapshot_json jsonb not null default '{}'::jsonb,
  evidence_snapshot_json jsonb not null default '{}'::jsonb,
  profile_snapshot_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

comment on table
  public.individual_professional_review_history
is
  'Immutable authorised human decisions for individual skilled professional verification and lifetime-free eligibility.';

comment on column
  public.individual_professional_review_history.ai_snapshot_json
is
  'Advisory AI assessment preserved at decision time. AI never acts as the reviewer.';

create index if not exists
  individual_professional_review_history_user_idx
on public.individual_professional_review_history(
  user_id,
  created_at desc
);

create index if not exists
  individual_professional_review_history_reviewer_idx
on public.individual_professional_review_history(
  reviewer_id,
  created_at desc
);

alter table public.individual_professional_review_history
  enable row level security;

revoke all
on public.individual_professional_review_history
from anon, authenticated;

commit;
