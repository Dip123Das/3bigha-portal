begin;

create or replace function public.admin_decide_registration_verification(
  p_user_id uuid,
  p_action text,
  p_reason text,
  p_case_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to public, auth, pg_catalog
as $function$
declare
  v_admin_id uuid := auth.uid();
  v_admin_role text;
  v_target_role text;
  v_previous_status text;
  v_previous_score integer := 0;
  v_previous_reasons jsonb := '[]'::jsonb;
  v_previous_approval text;
  v_previous_dashboard text;
  v_next_status text;
  v_next_approval text;
  v_next_dashboard text;
  v_event_type text;
  v_action text := lower(trim(coalesce(p_action, '')));
  v_reason text := trim(coalesce(p_reason, ''));
  v_case_exists boolean := false;
  v_trust jsonb := '{}'::jsonb;
begin
  if v_admin_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select lower(trim(coalesce(role, '')))
    into v_admin_role
  from public.profiles
  where id = v_admin_id;

  if v_admin_role <> 'master_admin' then
    raise exception 'Master administrator access is required'
      using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'A registration member is required'
      using errcode = '22023';
  end if;

  if v_action not in (
    'approve',
    'request_correction',
    'manual_review',
    'reject'
  ) then
    raise exception 'Unsupported registration review action'
      using errcode = '22023';
  end if;

  if char_length(v_reason) < 10 then
    raise exception 'A review reason of at least 10 characters is required'
      using errcode = '22023';
  end if;

  select
    lower(trim(coalesce(role, ''))),
    lower(trim(coalesce(registration_verification_status, 'draft'))),
    greatest(0, least(100, coalesce(registration_verification_score, 0))),
    coalesce(registration_verification_reasons, '[]'::jsonb),
    lower(trim(coalesce(approval_status, 'pending'))),
    lower(trim(coalesce(dashboard_activation_status, 'not_ready')))
  into
    v_target_role,
    v_previous_status,
    v_previous_score,
    v_previous_reasons,
    v_previous_approval,
    v_previous_dashboard
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Registration member not found';
  end if;

  if v_target_role = 'master_admin' then
    raise exception 'Master administrator registration cannot be changed here'
      using errcode = '42501';
  end if;

  if p_case_id is not null then
    select exists(
      select 1
      from public.registration_verification_cases review_case
      where review_case.id = p_case_id
        and review_case.user_id = p_user_id
    )
    into v_case_exists;

    if not v_case_exists then
      raise exception 'The selected verification case does not belong to this member'
        using errcode = '22023';
    end if;
  end if;

  select coalesce(
    business.automated_verification_json -> 'trustIntelligence',
    '{}'::jsonb
  )
  into v_trust
  from public.business_profiles business
  where business.user_id = p_user_id;

  v_trust := coalesce(v_trust, '{}'::jsonb);

  if v_action = 'approve' then
    v_next_status := 'admin_verified';
    v_next_approval := 'approved';
    v_next_dashboard :=
      case
        when v_previous_dashboard = 'active' then 'active'
        else 'ready'
      end;
    v_event_type := 'admin_registration_approved';
  elsif v_action = 'request_correction' then
    v_next_status := 'correction_required';
    v_next_approval :=
      case
        when v_previous_approval = 'approved' then 'approved'
        else 'pending'
      end;
    v_next_dashboard :=
      case
        when v_previous_dashboard = 'active' then 'active'
        else 'not_ready'
      end;
    v_event_type := 'admin_registration_correction_requested';
  elsif v_action = 'manual_review' then
    v_next_status := 'admin_review_required';
    v_next_approval := v_previous_approval;
    v_next_dashboard :=
      case
        when v_previous_dashboard = 'active' then 'active'
        else 'not_ready'
      end;
    v_event_type := 'admin_registration_manual_review_required';
  else
    v_next_status := 'restricted';
    v_next_approval := 'rejected';
    v_next_dashboard := 'suspended';
    v_event_type := 'admin_registration_rejected';
  end if;

  update public.profiles
     set registration_verification_status = v_next_status,
         registration_verified_at =
           case
             when v_next_status = 'admin_verified' then now()
             else registration_verified_at
           end,
         registration_verification_source = 'admin_registration_review_v1',
         admin_review_reason = v_reason,
         approval_status = v_next_approval,
         dashboard_activation_status = v_next_dashboard,
         updated_at = now()
   where id = p_user_id;

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
  ) values (
    p_user_id,
    v_event_type,
    v_previous_status,
    v_next_status,
    v_previous_score,
    v_previous_reasons || jsonb_build_array(v_reason),
    jsonb_build_object(
      'case_id', p_case_id,
      'action', v_action,
      'review_reason', v_reason,
      'previous_approval_status', v_previous_approval,
      'next_approval_status', v_next_approval,
      'previous_dashboard_status', v_previous_dashboard,
      'next_dashboard_status', v_next_dashboard,
      'trust_intelligence', v_trust,
      'subscription_changed', false,
      'dashboard_activated', false
    ),
    'admin_registration_review_v1',
    v_admin_id
  );

  return jsonb_build_object(
    'ok', true,
    'userId', p_user_id,
    'caseId', p_case_id,
    'action', v_action,
    'previousStatus', v_previous_status,
    'nextStatus', v_next_status,
    'approvalStatus', v_next_approval,
    'dashboardStatus', v_next_dashboard,
    'subscriptionChanged', false,
    'dashboardActivated', false,
    'decidedBy', v_admin_id,
    'decidedAt', now()
  );
end;
$function$;

alter function public.admin_decide_registration_verification(
  uuid,
  text,
  text,
  uuid
) owner to postgres;

revoke all on function public.admin_decide_registration_verification(
  uuid,
  text,
  text,
  uuid
) from public;

revoke all on function public.admin_decide_registration_verification(
  uuid,
  text,
  text,
  uuid
) from anon;

revoke all on function public.admin_decide_registration_verification(
  uuid,
  text,
  text,
  uuid
) from authenticated;

grant execute on function public.admin_decide_registration_verification(
  uuid,
  text,
  text,
  uuid
) to authenticated;

grant execute on function public.admin_decide_registration_verification(
  uuid,
  text,
  text,
  uuid
) to service_role;

commit;
