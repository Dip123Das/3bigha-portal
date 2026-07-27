begin;

-- R3.5F
-- Autonomous registration may activate a verified member's dashboard,
-- but must not modify the administrator-controlled approval_status.

create or replace function public.activate_self_registered_dashboard()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_verification jsonb;
  v_status text;
  v_dashboard_status text;
  v_score integer := 0;
  v_reasons jsonb := '[]'::jsonb;
  v_registration_complete boolean := false;
  v_approval_status text;
  v_account_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  perform 1
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Member profile not found.';
  end if;

  perform 1
  from public.business_profiles
  where user_id = v_user_id
  for update;

  if not found then
    raise exception 'Business profile not found.';
  end if;

  select
    dashboard_activation_status,
    approval_status,
    account_status
  into
    v_dashboard_status,
    v_approval_status,
    v_account_status
  from public.profiles
  where id = v_user_id;

  select coalesce(registration_complete, false)
  into v_registration_complete
  from public.business_profiles
  where user_id = v_user_id;

  if v_dashboard_status = 'active'
     and v_registration_complete is true then
    return jsonb_build_object(
      'ok', true,
      'activated', true,
      'already_active', true,
      'status', 'auto_verified',
      'score', 100,
      'reasons',
        jsonb_build_array('The dashboard is already active.'),
      'registration_complete', true,
      'approval_status', v_approval_status,
      'dashboard_status', 'active',
      'can_activate_dashboard', true,
      'dashboard_activated', true,
      'approval_status_changed', false,
      'subscription_changed', false,
      'decision_source',
        'atomic_self_registration_activation_v3'
    );
  end if;

  v_verification :=
    public.evaluate_automated_registration_verification();

  v_status :=
    lower(trim(coalesce(
      v_verification ->> 'status',
      ''
    )));

  v_dashboard_status :=
    lower(trim(coalesce(
      v_verification ->> 'dashboard_status',
      'not_ready'
    )));

  begin
    v_score :=
      coalesce(
        nullif(v_verification ->> 'score', '')::integer,
        0
      );
  exception
    when invalid_text_representation then
      v_score := 0;
  end;

  if jsonb_typeof(v_verification -> 'reasons') = 'array' then
    v_reasons := v_verification -> 'reasons';
  end if;

  if v_status <> 'auto_verified'
     or v_dashboard_status <> 'ready'
     or coalesce(
       (v_verification ->> 'can_activate_dashboard')::boolean,
       false
     ) is not true then
    return jsonb_build_object(
      'ok', false,
      'activated', false,
      'already_active', false,
      'status', v_status,
      'score', v_score,
      'reasons', v_reasons,
      'registration_complete', false,
      'approval_status', v_approval_status,
      'dashboard_status', v_dashboard_status,
      'can_activate_dashboard', false,
      'dashboard_activated', false,
      'approval_status_changed', false,
      'subscription_changed', false,
      'decision_source',
        coalesce(
          v_verification ->> 'decision_source',
          'automated_registration_verification_v1'
        )
    );
  end if;

  if public.business_registration_evidence_ready(v_user_id)
     is not true then
    raise exception
      'Canonical registration evidence was not ready after automated verification.'
      using errcode = '23514';
  end if;

  update public.business_profiles
  set
    registration_complete = true,
    updated_at = now()
  where user_id = v_user_id;

  if not found then
    raise exception 'Business profile completion update failed.';
  end if;

  /*
   * approval_status is intentionally not modified.
   * It remains under authorised administrative control.
   */
  update public.profiles
  set
    onboarding_version =
      greatest(coalesce(onboarding_version, 0), 2),
    onboarding_completed = true,
    dashboard_activation_status = 'active',
    dashboard_activated_at =
      coalesce(dashboard_activated_at, now()),
    admin_review_reason = null,
    updated_at = now()
  where id = v_user_id;

  if not found then
    raise exception 'Member dashboard activation update failed.';
  end if;

  insert into public.registration_verification_events(
    user_id,
    event_type,
    previous_status,
    next_status,
    score,
    reasons,
    evidence_snapshot,
    decision_source,
    decided_by
  )
  values (
    v_user_id,
    'self_registration_dashboard_activated',
    'auto_verified',
    'auto_verified',
    v_score,
    v_reasons,
    jsonb_build_object(
      'registration_complete', true,
      'approval_status', v_approval_status,
      'approval_status_changed', false,
      'dashboard_activation_status', 'active',
      'account_status', v_account_status,
      'activation_mode', 'member_self_activation',
      'authority',
        'business_registration_evidence_ready'
    ),
    'atomic_self_registration_activation_v3',
    null
  );

  return jsonb_build_object(
    'ok', true,
    'activated', true,
    'already_active', false,
    'status', 'auto_verified',
    'score', v_score,
    'reasons', v_reasons,
    'registration_complete', true,
    'approval_status', v_approval_status,
    'dashboard_status', 'active',
    'can_activate_dashboard', true,
    'dashboard_activated', true,
    'approval_status_changed', false,
    'subscription_changed', false,
    'decision_source',
      'atomic_self_registration_activation_v3'
  );
end;
$function$;

alter function
  public.activate_self_registered_dashboard()
  owner to postgres;

revoke all on function
  public.activate_self_registered_dashboard()
  from public;

revoke all on function
  public.activate_self_registered_dashboard()
  from anon;

grant execute on function
  public.activate_self_registered_dashboard()
  to authenticated;

grant execute on function
  public.activate_self_registered_dashboard()
  to service_role;

comment on function
  public.activate_self_registered_dashboard()
is
  'Atomic autonomous dashboard activation using canonical evidence while preserving administrator-controlled approval status.';

commit;
