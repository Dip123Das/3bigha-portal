begin;

create or replace function public.apply_individual_professional_review(
  p_user_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_reason text,
  p_reviewer_notes text,
  p_profile_update jsonb,
  p_ai_snapshot jsonb,
  p_evidence_snapshot jsonb,
  p_profile_snapshot jsonb
)
returns public.individual_professional_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_before public.individual_professional_profiles%rowtype;
  v_after public.individual_professional_profiles%rowtype;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_reviewer_id
      and role = 'master_admin'
  ) then
    raise exception
      'Only a master administrator may apply this review';
  end if;

  if auth.uid() is not null
     and auth.uid() <> p_reviewer_id then
    raise exception
      'Reviewer identity mismatch';
  end if;

  if p_decision not in (
    'approved_lifetime_free',
    'correction_requested',
    'rejected_misuse',
    'reclassified_as_business'
  ) then
    raise exception
      'Invalid individual professional review decision';
  end if;

  if nullif(trim(p_reason), '') is null
     or length(trim(p_reason)) < 8 then
    raise exception
      'A clear review reason is required';
  end if;

  select *
  into v_before
  from public.individual_professional_profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception
      'Individual professional profile not found';
  end if;

  update public.individual_professional_profiles
  set
    verification_status =
      coalesce(
        p_profile_update->>'verification_status',
        verification_status
      ),

    economic_mode =
      coalesce(
        p_profile_update->>'economic_mode',
        economic_mode
      ),

    contractor_risk_status =
      coalesce(
        p_profile_update->>'contractor_risk_status',
        contractor_risk_status
      ),

    lifetime_free_decision_status =
      coalesce(
        p_profile_update->>'lifetime_free_decision_status',
        lifetime_free_decision_status
      ),

    lifetime_free_decision_reason =
      case
        when p_profile_update
          ? 'lifetime_free_decision_reason'
        then
          p_profile_update
            ->>'lifetime_free_decision_reason'
        else
          lifetime_free_decision_reason
      end,

    lifetime_free_eligible =
      case
        when p_profile_update
          ? 'lifetime_free_eligible'
        then
          (
            p_profile_update
              ->>'lifetime_free_eligible'
          )::boolean
        else
          lifetime_free_eligible
      end,

    lifetime_free_approved_at =
      case
        when p_profile_update
          ? 'lifetime_free_approved_at'
        then
          nullif(
            p_profile_update
              ->>'lifetime_free_approved_at',
            ''
          )::timestamptz
        else
          lifetime_free_approved_at
      end,

    lifetime_free_approved_by =
      case
        when p_profile_update
          ? 'lifetime_free_approved_by'
        then
          nullif(
            p_profile_update
              ->>'lifetime_free_approved_by',
            ''
          )::uuid
        else
          lifetime_free_approved_by
      end,

    classification_reviewed_at =
      nullif(
        p_profile_update
          ->>'classification_reviewed_at',
        ''
      )::timestamptz,

    classification_reviewed_by =
      nullif(
        p_profile_update
          ->>'classification_reviewed_by',
        ''
      )::uuid,

    verified_at =
      case
        when p_profile_update
          ? 'verified_at'
        then
          nullif(
            p_profile_update
              ->>'verified_at',
            ''
          )::timestamptz
        else
          verified_at
      end,

    verified_by =
      case
        when p_profile_update
          ? 'verified_by'
        then
          nullif(
            p_profile_update
              ->>'verified_by',
            ''
          )::uuid
        else
          verified_by
      end,

    reclassification_reason =
      case
        when p_profile_update
          ? 'reclassification_reason'
        then
          p_profile_update
            ->>'reclassification_reason'
        else
          reclassification_reason
      end,

    updated_at = now()

  where user_id = p_user_id

  returning *
  into v_after;

  insert into
    public.individual_professional_review_history (
      user_id,
      reviewer_id,
      decision,

      previous_verification_status,
      next_verification_status,

      previous_decision_status,
      next_decision_status,

      previous_contractor_risk_status,
      next_contractor_risk_status,

      reason,
      reviewer_notes,

      ai_snapshot_json,
      evidence_snapshot_json,
      profile_snapshot_json
    )
  values (
    p_user_id,
    p_reviewer_id,
    p_decision,

    v_before.verification_status,
    v_after.verification_status,

    v_before.lifetime_free_decision_status,
    v_after.lifetime_free_decision_status,

    v_before.contractor_risk_status,
    v_after.contractor_risk_status,

    trim(p_reason),
    nullif(trim(p_reviewer_notes), ''),

    coalesce(p_ai_snapshot, '{}'::jsonb),
    coalesce(p_evidence_snapshot, '{}'::jsonb),
    coalesce(p_profile_snapshot, '{}'::jsonb)
  );

  return v_after;
end;
$$;

revoke all
on function public.apply_individual_professional_review(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
)
from public, anon, authenticated;

commit;
