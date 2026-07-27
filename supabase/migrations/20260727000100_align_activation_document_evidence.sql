begin;

-- R-2C: corrected canonical verifier and atomic self-activation.

CREATE OR REPLACE FUNCTION public.evaluate_automated_registration_verification()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_catalog'
AS $function$
declare
  v_user_id uuid := auth.uid();

  v_role text;
  v_account_status text;
  v_previous_status text;
  v_previous_dashboard_status text;
  v_onboarding_completed boolean := false;

  v_business_exists boolean := false;
  v_business_complete boolean := false;
  v_registration_complete boolean := false;
  v_location_status text;
  v_selfie_status text;
  v_selfie_media jsonb;
  v_workplace_status text;
  v_workplace_media jsonb;
  v_automated_json jsonb;
  v_vendor_document_json jsonb;

  v_business_required boolean := false;
  v_selfie_required boolean := false;
  v_workplace_required boolean := false;
  v_document_required boolean := false;

  v_selfie_present boolean := false;
  v_workplace_present boolean := false;

  v_document_status text := '';
  v_document_confidence integer := 0;

  v_next_status text := 'evidence_incomplete';
  v_dashboard_status text := 'not_ready';
  v_score integer := 0;
  v_reasons jsonb := '[]'::jsonb;
  v_evidence_snapshot jsonb := '{}'::jsonb;
  v_event_type text := 'automated_verification_evaluated';

  v_blocked_accounts constant text[] :=
    array[
      'deactivated',
      're_registration_required',
      'permanently_blocked'
    ];

  v_permitted_roles constant text[] :=
    array[
      'buyer',
      'vendor',
      'builder',
      'hub_vendor',
      'blogger',
      'investor'
    ];

  v_business_roles constant text[] :=
    array[
      'vendor',
      'builder',
      'hub_vendor'
    ];
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select
    profile.role,
    lower(trim(coalesce(profile.account_status, 'active'))),
    coalesce(profile.onboarding_completed, false),
    profile.registration_verification_status,
    profile.dashboard_activation_status
  into
    v_role,
    v_account_status,
    v_onboarding_completed,
    v_previous_status,
    v_previous_dashboard_status
  from public.profiles profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception 'Member profile not found';
  end if;

  if v_role is null
     or not (v_role = any(v_permitted_roles)) then
    raise exception
      'Automated verification requires an existing permitted member role.'
      using errcode = '42501';
  end if;

  select
    true,
    coalesce(business.is_complete, false),
    coalesce(business.registration_complete, false),
    lower(trim(coalesce(
      business.location_verification_status,
      ''
    ))),
    lower(trim(coalesce(
      business.selfie_capture_status,
      'missing'
    ))),
    business.selfie_media_json,
    lower(trim(coalesce(
      business.workplace_evidence_status,
      'missing'
    ))),
    business.workplace_media_json,
    coalesce(
      business.automated_verification_json,
      '{}'::jsonb
    ),
    coalesce(
      business.vendor_document_verification_json,
      '{}'::jsonb
    )
  into
    v_business_exists,
    v_business_complete,
    v_registration_complete,
    v_location_status,
    v_selfie_status,
    v_selfie_media,
    v_workplace_status,
    v_workplace_media,
    v_automated_json,
    v_vendor_document_json
  from public.business_profiles business
  where business.user_id = v_user_id
  for update;

  v_business_exists := coalesce(v_business_exists, false);

  /*
   * Role-based evidence policy v1.
   *
   * Business operating identities require their completed business
   * registration, live selfie, workplace evidence and registration
   * document evidence.
   *
   * Buyer, blogger and investor identities do not receive business
   * evidence obligations merely to enter their Essential Workspace.
   */
  v_business_required :=
    v_role = any(v_business_roles);

  v_selfie_required :=
    v_role = any(v_business_roles);

  v_workplace_required :=
    v_role = any(v_business_roles);

  v_document_required :=
    v_role = any(v_business_roles);

  v_selfie_present :=
    v_selfie_media is not null
    and v_selfie_media <> '{}'::jsonb
    and v_selfie_media <> '[]'::jsonb
    and v_selfie_media <> 'null'::jsonb;

  v_workplace_present :=
    v_workplace_media is not null
    and v_workplace_media <> '[]'::jsonb
    and v_workplace_media <> '{}'::jsonb
    and v_workplace_media <> 'null'::jsonb;

  /*
   * Read the existing automated evidence envelope defensively.
   * These fallbacks allow the verifier to remain compatible while
   * document capture is consolidated in a later milestone.
   */
  v_document_status :=
    lower(trim(coalesce(
      v_vendor_document_json ->> 'status',
      v_vendor_document_json #>> '{documentVerification,status}',
      v_vendor_document_json #>> '{document_verification,status}',
      v_automated_json #>> '{documentVerification,status}',
      v_automated_json #>> '{document_verification,status}',
      v_automated_json #>> '{document,status}',
      v_automated_json ->> 'document_verification_status',
      ''
    )));

  begin
    v_document_confidence :=
      greatest(
        0,
        least(
          100,
          coalesce(
            nullif(
              v_vendor_document_json ->> 'confidence',
              ''
            )::numeric,
            nullif(
              v_vendor_document_json
                #>> '{documentVerification,confidence}',
              ''
            )::numeric,
            nullif(
              v_vendor_document_json
                #>> '{document_verification,confidence}',
              ''
            )::numeric,
            nullif(
              v_automated_json
                #>> '{documentVerification,confidence}',
              ''
            )::numeric,
            nullif(
              v_automated_json
                #>> '{document_verification,confidence}',
              ''
            )::numeric,
            nullif(
              v_automated_json
                #>> '{document,confidence}',
              ''
            )::numeric,
            nullif(
              v_automated_json
                ->> 'document_verification_confidence',
              ''
            )::numeric,
            0
          )::integer
        )
      );
  exception
    when invalid_text_representation then
      v_document_confidence := 0;
  end;

  /*
   * Security restrictions have absolute precedence.
   */
  if v_account_status = any(v_blocked_accounts)
     or v_previous_status = 'restricted'
     or v_previous_dashboard_status = 'suspended' then

    v_next_status := 'restricted';
    v_dashboard_status := 'suspended';
    v_score := 0;
    v_event_type := 'automated_verification_restricted';

    v_reasons := jsonb_build_array(
      case
        when v_account_status = any(v_blocked_accounts)
          then 'Account status prevents automated registration verification.'
        when v_previous_status = 'restricted'
          then 'Registration is already security restricted.'
        else 'Dashboard access is suspended.'
      end
    );

  /*
   * Explicit correction states precede review states.
   */
  elsif v_selfie_status = 'correction_required'
     or v_workplace_status = 'correction_required'
     or v_document_status in (
       'format_invalid',
       'format_valid_document_mismatch',
       'correction_required',
       'document_missing',
       'unreadable'
     ) then

    v_next_status := 'correction_required';
    v_dashboard_status := 'not_ready';
    v_score := 25;
    v_event_type := 'automated_verification_correction_required';

    v_reasons :=
      '[]'::jsonb
      ||
      case
        when v_selfie_status = 'correction_required'
          then jsonb_build_array(
            'The live selfie requires correction.'
          )
        else '[]'::jsonb
      end
      ||
      case
        when v_workplace_status = 'correction_required'
          then jsonb_build_array(
            'The workplace evidence requires correction.'
          )
        else '[]'::jsonb
      end
      ||
      case
        when v_document_status in (
          'format_invalid',
          'format_valid_document_mismatch',
          'correction_required',
          'document_missing',
          'unreadable'
        )
          then jsonb_build_array(
            'The registration document is invalid, unreadable or does not match the entered information.'
          )
        else '[]'::jsonb
      end;

  /*
   * Ambiguous evidence is an exceptional review path.
   */
  elsif v_selfie_status = 'admin_review_required'
     or v_workplace_status = 'admin_review_required'
     or v_document_status in (
       'needs_review',
       'admin_review_required',
       'low_confidence'
     )
     or (
       v_document_required
       and v_document_status <> ''
       and v_document_status not in (
         'verified_by_ai',
         'verified',
         'matched'
       )
       and v_document_confidence > 0
       and v_document_confidence < 85
     ) then

    v_next_status := 'admin_review_required';
    v_dashboard_status := 'not_ready';
    v_score := greatest(40, v_document_confidence);
    v_event_type := 'automated_verification_admin_review_required';

    v_reasons :=
      '[]'::jsonb
      ||
      case
        when v_selfie_status = 'admin_review_required'
          then jsonb_build_array(
            'The live selfie requires exceptional administrator review.'
          )
        else '[]'::jsonb
      end
      ||
      case
        when v_workplace_status = 'admin_review_required'
          then jsonb_build_array(
            'The workplace evidence requires exceptional administrator review.'
          )
        else '[]'::jsonb
      end
      ||
      case
        when v_document_status in (
          'needs_review',
          'admin_review_required',
          'low_confidence'
        )
        or (
          v_document_required
          and v_document_status <> ''
          and v_document_status not in (
            'verified_by_ai',
            'verified',
            'matched'
          )
          and v_document_confidence > 0
          and v_document_confidence < 85
        )
          then jsonb_build_array(
            'The registration document requires exceptional administrator review.'
          )
        else '[]'::jsonb
      end;

  /*
   * Automatic verification requires every applicable stored fact.
   */
  elsif not v_onboarding_completed
     or (
       v_business_required
       and (
         not v_business_exists
         or not v_business_complete
       )
     )
     or (
       v_business_required
       and v_location_status <> 'verified'
     )
     or (
       v_selfie_required
       and (
         v_selfie_status <> 'verified'
         or not v_selfie_present
       )
     )
     or (
       v_workplace_required
       and (
         v_workplace_status <> 'verified'
         or not v_workplace_present
       )
     )
     or (
       v_document_required
       and (
         v_document_status not in (
           'verified_by_ai',
           'verified',
           'matched'
         )
         or v_document_confidence < 85
       )
     ) then

    v_next_status := 'evidence_incomplete';
    v_dashboard_status := 'not_ready';
    v_event_type := 'automated_verification_evidence_incomplete';

    v_score :=
      least(
        80,
        (
          case
            when v_onboarding_completed
              then 15
            else 0
          end
          +
          case
            when not v_business_required
              or (
                v_business_exists
                and v_business_complete
              )
              then 20
            else 0
          end
          +
          case
            when not v_business_required
              or v_location_status = 'verified'
              then 15
            else 0
          end
          +
          case
            when not v_selfie_required
              or (
                v_selfie_status = 'verified'
                and v_selfie_present
              )
              then 15
            else 0
          end
          +
          case
            when not v_workplace_required
              or (
                v_workplace_status = 'verified'
                and v_workplace_present
              )
              then 15
            else 0
          end
          +
          case
            when not v_document_required
              or (
                v_document_status in (
                  'verified_by_ai',
                  'verified',
                  'matched'
                )
                and v_document_confidence >= 85
              )
              then 20
            else 0
          end
        )
      );

    v_reasons :=
      '[]'::jsonb
      ||
      case
        when not v_onboarding_completed
          then jsonb_build_array(
            'The canonical onboarding journey is incomplete.'
          )
        else '[]'::jsonb
      end
      ||
      case
        when v_business_required
         and (
           not v_business_exists
           or not v_business_complete
         )
          then jsonb_build_array(
            'The required business registration is incomplete.'
          )
        else '[]'::jsonb
      end
      ||
      case
        when v_business_required
         and v_location_status <> 'verified'
          then jsonb_build_array(
            'The official live business location has not been verified.'
          )
        else '[]'::jsonb
      end
      ||
      case
        when v_selfie_required
         and (
           v_selfie_status <> 'verified'
           or not v_selfie_present
         )
          then jsonb_build_array(
            'A verified live selfie with stored evidence is required.'
          )
        else '[]'::jsonb
      end
      ||
      case
        when v_workplace_required
         and (
           v_workplace_status <> 'verified'
           or not v_workplace_present
         )
          then jsonb_build_array(
            'Verified workplace evidence is required.'
          )
        else '[]'::jsonb
      end
      ||
      case
        when v_document_required
         and (
           v_document_status not in (
             'verified_by_ai',
             'verified',
             'matched'
           )
           or v_document_confidence < 85
         )
          then jsonb_build_array(
            'A matching registration document with sufficient verification confidence is required.'
          )
        else '[]'::jsonb
      end;

  else
    v_next_status := 'auto_verified';
    v_dashboard_status := 'ready';
    v_score := 100;
    v_event_type := 'automated_verification_passed';

    v_reasons := jsonb_build_array(
      'All applicable identity, registration, location and evidence requirements were authoritatively verified.'
    );
  end if;

  v_evidence_snapshot := jsonb_build_object(
    'policy_version',
      'automated_registration_verification_v1',
    'role',
      v_role,
    'account_status',
      v_account_status,
    'onboarding_completed',
      v_onboarding_completed,
    'business_required',
      v_business_required,
    'business_profile_exists',
      v_business_exists,
    'business_profile_complete',
      v_business_complete,
    'registration_complete',
      v_registration_complete,
    'location_verification_status',
      coalesce(v_location_status, ''),
    'selfie_required',
      v_selfie_required,
    'selfie_capture_status',
      coalesce(v_selfie_status, ''),
    'selfie_evidence_present',
      v_selfie_present,
    'workplace_required',
      v_workplace_required,
    'workplace_evidence_status',
      coalesce(v_workplace_status, ''),
    'workplace_evidence_present',
      v_workplace_present,
    'document_required',
      v_document_required,
    'document_verification_status',
      v_document_status,
    'document_verification_confidence',
      v_document_confidence
  );

  update public.profiles
     set registration_verification_status =
           v_next_status,
         registration_verification_score =
           v_score,
         registration_verification_reasons =
           v_reasons,
         registration_verified_at =
           case
             when v_next_status in (
               'auto_verified',
               'admin_verified'
             )
               then coalesce(
                 registration_verified_at,
                 now()
               )
             else null
           end,
         registration_verification_source =
           'automated_registration_verification_v1',
         dashboard_activation_status =
           v_dashboard_status,
         dashboard_activated_at =
           case
             when v_dashboard_status = 'active'
               then dashboard_activated_at
             else null
           end,
         admin_review_reason =
           case
             when v_next_status =
               'admin_review_required'
               then array_to_string(
                 array(
                   select jsonb_array_elements_text(
                     v_reasons
                   )
                 ),
                 ' '
               )
             else null
           end,
         updated_at = now()
   where id = v_user_id;

  if v_business_exists then
    update public.business_profiles
       set automated_verification_json =
             coalesce(
               automated_verification_json,
               '{}'::jsonb
             )
             ||
             jsonb_build_object(
               'registrationDecision',
               jsonb_build_object(
                 'status',
                   v_next_status,
                 'score',
                   v_score,
                 'dashboardStatus',
                   v_dashboard_status,
                 'reasons',
                   v_reasons,
                 'decisionSource',
                   'automated_registration_verification_v1',
                 'evaluatedAt',
                   now()
               )
             ),
           updated_at = now()
     where user_id = v_user_id;
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
    v_event_type,
    v_previous_status,
    v_next_status,
    v_score,
    v_reasons,
    v_evidence_snapshot,
    'automated_registration_verification_v1',
    null
  );

  return jsonb_build_object(
    'ok',
      true,
    'status',
      v_next_status,
    'score',
      v_score,
    'reasons',
      v_reasons,
    'dashboard_status',
      v_dashboard_status,
    'can_activate_dashboard',
      v_next_status = 'auto_verified'
      and v_dashboard_status = 'ready',
    'dashboard_activated',
      false,
    'approval_status_changed',
      false,
    'subscription_changed',
      false,
    'decision_source',
      'automated_registration_verification_v1'
  );
end;
$function$;


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
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform 1 from public.profiles where id = v_user_id for update;
  if not found then raise exception 'Member profile not found.'; end if;

  perform 1 from public.business_profiles where user_id = v_user_id for update;
  if not found then raise exception 'Business profile not found.'; end if;

  select dashboard_activation_status, approval_status, account_status
    into v_dashboard_status, v_approval_status, v_account_status
  from public.profiles
  where id = v_user_id;

  select coalesce(registration_complete, false)
    into v_registration_complete
  from public.business_profiles
  where user_id = v_user_id;

  if v_dashboard_status = 'active' and v_registration_complete is true then
    return jsonb_build_object(
      'ok', true,
      'activated', true,
      'already_active', true,
      'status', 'auto_verified',
      'score', 100,
      'reasons', jsonb_build_array('The dashboard is already active.'),
      'registration_complete', true,
      'approval_status', v_approval_status,
      'dashboard_status', 'active',
      'can_activate_dashboard', true,
      'dashboard_activated', true,
      'approval_status_changed', false,
      'subscription_changed', false,
      'decision_source', 'atomic_self_registration_activation_v1'
    );
  end if;

  v_verification := public.evaluate_automated_registration_verification();
  v_status := lower(trim(coalesce(v_verification ->> 'status', '')));
  v_dashboard_status := lower(trim(coalesce(v_verification ->> 'dashboard_status', 'not_ready')));

  begin
    v_score := coalesce(nullif(v_verification ->> 'score', '')::integer, 0);
  exception
    when invalid_text_representation then v_score := 0;
  end;

  if jsonb_typeof(v_verification -> 'reasons') = 'array' then
    v_reasons := v_verification -> 'reasons';
  end if;

  if v_status <> 'auto_verified'
     or v_dashboard_status <> 'ready'
     or coalesce((v_verification ->> 'can_activate_dashboard')::boolean, false) is not true then
    return jsonb_build_object(
      'ok', false,
      'activated', false,
      'already_active', false,
      'status', v_status,
      'score', v_score,
      'reasons', v_reasons,
      'registration_complete', false,
      'dashboard_status', v_dashboard_status,
      'can_activate_dashboard', false,
      'dashboard_activated', false,
      'approval_status_changed', false,
      'subscription_changed', false,
      'decision_source', coalesce(v_verification ->> 'decision_source', 'automated_registration_verification_v1')
    );
  end if;

  v_registration_complete := public.vendor_registration_complete(v_user_id);
  if v_registration_complete is not true then
    raise exception 'Canonical registration completion failed after automated verification.' using errcode = '23514';
  end if;

  update public.profiles
     set approval_status = 'approved',
         onboarding_version = greatest(coalesce(onboarding_version, 0), 2),
         onboarding_completed = true,
         dashboard_activation_status = 'active',
         dashboard_activated_at = coalesce(dashboard_activated_at, now()),
         admin_review_reason = null,
         updated_at = now()
   where id = v_user_id;

  insert into public.registration_verification_events(
    user_id, event_type, previous_status, next_status, score,
    reasons, evidence_snapshot, decision_source, decided_by
  ) values (
    v_user_id,
    'self_registration_dashboard_activated',
    'auto_verified',
    'auto_verified',
    v_score,
    v_reasons,
    jsonb_build_object(
      'registration_complete', true,
      'approval_status', 'approved',
      'dashboard_activation_status', 'active',
      'account_status', v_account_status,
      'activation_mode', 'member_self_activation'
    ),
    'atomic_self_registration_activation_v1',
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
    'approval_status', 'approved',
    'dashboard_status', 'active',
    'can_activate_dashboard', true,
    'dashboard_activated', true,
    'approval_status_changed', true,
    'subscription_changed', false,
    'decision_source', 'atomic_self_registration_activation_v1'
  );
end;
$function$;

alter function public.evaluate_automated_registration_verification() owner to postgres;
alter function public.activate_self_registered_dashboard() owner to postgres;

revoke all on function public.evaluate_automated_registration_verification() from public;
revoke all on function public.evaluate_automated_registration_verification() from anon;
grant execute on function public.evaluate_automated_registration_verification() to authenticated;
grant execute on function public.evaluate_automated_registration_verification() to service_role;

revoke all on function public.activate_self_registered_dashboard() from public;
revoke all on function public.activate_self_registered_dashboard() from anon;
grant execute on function public.activate_self_registered_dashboard() to authenticated;
grant execute on function public.activate_self_registered_dashboard() to service_role;

commit;
