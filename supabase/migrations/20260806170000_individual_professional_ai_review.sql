begin;

alter table public.individual_professional_profiles
  add column if not exists ai_verification_status text
    not null default 'not_started'
    check (
      ai_verification_status in (
        'not_started',
        'analysing',
        'strong_match',
        'likely_match',
        'unclear',
        'likely_unrelated',
        'contractor_risk',
        'human_review',
        'failed'
      )
    ),

  add column if not exists ai_confidence numeric(5,4)
    check (
      ai_confidence is null
      or ai_confidence between 0 and 1
    ),

  add column if not exists ai_result_json jsonb
    not null default '{}'::jsonb,

  add column if not exists ai_reviewed_at timestamptz,

  add column if not exists lifetime_free_decision_status text
    not null default 'not_evaluated'
    check (
      lifetime_free_decision_status in (
        'not_evaluated',
        'pending_ai_review',
        'pending_human_review',
        'eligible_after_human_approval',
        'approved',
        'not_eligible',
        'reclassified_as_business'
      )
    ),

  add column if not exists lifetime_free_decision_reason text,

  add column if not exists lifetime_free_approved_at timestamptz,

  add column if not exists lifetime_free_approved_by uuid
    references auth.users(id),

  add column if not exists classification_reviewed_at timestamptz,

  add column if not exists classification_reviewed_by uuid
    references auth.users(id);

alter table public.individual_professional_profiles
  drop constraint if exists
    individual_professional_lifetime_free_approval_guard;

alter table public.individual_professional_profiles
  add constraint individual_professional_lifetime_free_approval_guard
  check (
    lifetime_free_eligible = false
    or (
      lifetime_free_decision_status = 'approved'
      and lifetime_free_approved_at is not null
      and lifetime_free_approved_by is not null
      and verification_status = 'verified'
      and economic_mode = 'self_working_individual'
      and worker_declaration_accepted = true
      and contractor_risk_status in ('not_detected', 'cleared')
      and selfie_verification_status = 'verified'
      and work_evidence_verification_status = 'verified'
      and original_name_warning_accepted = true
    )
  );

comment on column
  public.individual_professional_profiles.ai_result_json
is
  'Advisory AI assessment of identity, skill evidence and contractor risk. AI does not independently approve or suspend a member.';

comment on column
  public.individual_professional_profiles.lifetime_free_decision_status
is
  'Human-governed constitutional decision state. Lifetime-free eligibility becomes true only after authorised approval.';

create index if not exists
  individual_professional_ai_verification_idx
on public.individual_professional_profiles(ai_verification_status);

create index if not exists
  individual_professional_lifetime_decision_idx
on public.individual_professional_profiles(lifetime_free_decision_status);

commit;
