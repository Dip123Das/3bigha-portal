begin;

create or replace function public.evaluate_registration_trust_intelligence()
returns jsonb
language plpgsql
security definer
set search_path to public, auth, pg_catalog
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_onboarding_completed boolean := false;
  v_registration_status text := '';
  v_authoritative_score integer := 0;
  v_authoritative_reasons jsonb := '[]'::jsonb;

  v_business_exists boolean := false;
  v_business_complete boolean := false;
  v_registration_complete boolean := false;
  v_location_status text := '';
  v_selfie_status text := '';
  v_workplace_status text := '';
  v_selfie_media jsonb := '{}'::jsonb;
  v_workplace_media jsonb := '[]'::jsonb;
  v_business_media jsonb := '[]'::jsonb;
  v_automated_json jsonb := '{}'::jsonb;
  v_vendor_document_json jsonb := '{}'::jsonb;

  v_document_status text := '';
  v_document_confidence integer := 0;
  v_business_required boolean := false;
  v_selfie_present boolean := false;
  v_workplace_present boolean := false;

  v_identity_trust integer := 0;
  v_location_trust integer := 0;
  v_evidence_trust integer := 0;
  v_capture_integrity_trust integer := 0;
  v_business_activity_trust integer := 0;
  v_overall_trust integer := 0;

  v_capture_count integer := 0;
  v_bound_capture_count integer := 0;
  v_mocked_capture_count integer := 0;
  v_stale_capture_count integer := 0;
  v_inaccurate_capture_count integer := 0;

  v_asset jsonb;
  v_assets jsonb := '[]'::jsonb;
  v_capture_metadata jsonb;

  v_risk_level text := 'HIGH';
  v_recommended_action text := 'REQUEST_MORE_EVIDENCE';
  v_explanations jsonb := '[]'::jsonb;
  v_result jsonb;

  v_business_roles constant text[] :=
    array['vendor', 'builder', 'hub_vendor'];
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select
    profile.role,
    coalesce(profile.onboarding_completed, false),
    lower(trim(coalesce(
      profile.registration_verification_status,
      ''
    ))),
    greatest(
      0,
      least(
        100,
        coalesce(
          profile.registration_verification_score,
          0
        )
      )
    ),
    coalesce(
      profile.registration_verification_reasons,
      '[]'::jsonb
    )
  into
    v_role,
    v_onboarding_completed,
    v_registration_status,
    v_authoritative_score,
    v_authoritative_reasons
  from public.profiles profile
  where profile.id = v_user_id;

  if not found then
    raise exception 'Member profile not found';
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
    lower(trim(coalesce(
      business.workplace_evidence_status,
      'missing'
    ))),
    coalesce(
      business.selfie_media_json,
      '{}'::jsonb
    ),
    coalesce(
      business.workplace_media_json,
      '[]'::jsonb
    ),
    coalesce(
      business.business_media_json,
      '[]'::jsonb
    ),
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
    v_workplace_status,
    v_selfie_media,
    v_workplace_media,
    v_business_media,
    v_automated_json,
    v_vendor_document_json
  from public.business_profiles business
  where business.user_id = v_user_id;

  v_business_exists := coalesce(v_business_exists, false);
  v_business_required := v_role = any(v_business_roles);

  v_selfie_present :=
    v_selfie_media not in (
      '{}'::jsonb,
      '[]'::jsonb,
      'null'::jsonb
    );

  v_workplace_present :=
    v_workplace_media not in (
      '{}'::jsonb,
      '[]'::jsonb,
      'null'::jsonb
    );

  if jsonb_typeof(v_business_media) = 'array' then
    v_selfie_present :=
      v_selfie_present
      or exists (
        select 1
        from jsonb_array_elements(v_business_media) asset
        where lower(coalesce(
          asset ->> 'evidenceCategory',
          asset ->> 'category',
          asset ->> 'path',
          ''
        )) like '%selfie%'
      );

    v_workplace_present :=
      v_workplace_present
      or exists (
        select 1
        from jsonb_array_elements(v_business_media) asset
        where lower(coalesce(
          asset ->> 'evidenceCategory',
          asset ->> 'category',
          asset ->> 'path',
          ''
        )) like any(array[
          '%work_photo%',
          '%workplace%',
          '%practical-proof%'
        ])
      );
  end if;

  v_document_status :=
    lower(trim(coalesce(
      v_vendor_document_json ->> 'status',
      v_vendor_document_json
        #>> '{documentVerification,status}',
      v_vendor_document_json
        #>> '{document_verification,status}',
      v_automated_json
        #>> '{documentVerification,status}',
      v_automated_json
        #>> '{document_verification,status}',
      v_automated_json #>> '{document,status}',
      v_automated_json
        ->> 'document_verification_status',
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

  v_identity_trust :=
    case
      when not v_onboarding_completed then 25
      when v_business_required
           and (
             not v_business_exists
             or not v_business_complete
           ) then 60
      else 100
    end;

  v_location_trust :=
    case v_location_status
      when 'verified' then 100
      when 'pending_review' then 60
      when 'pending' then 40
      when 'correction_required' then 15
      else
        case
          when v_business_required then 0
          else 100
        end
    end;

  v_evidence_trust :=
    least(
      100,
      (
        case
          when not v_business_required
               or (
                 v_selfie_present
                 and v_selfie_status = 'verified'
               )
            then 35
          when v_selfie_present then 18
          else 0
        end
        +
        case
          when not v_business_required
               or (
                 v_workplace_present
                 and v_workplace_status = 'verified'
               )
            then 35
          when v_workplace_present then 18
          else 0
        end
        +
        case
          when not v_business_required then 30
          when v_document_status in (
            'verified_by_ai',
            'verified',
            'matched'
          )
            then round(
              30 * v_document_confidence / 100.0
            )::integer
          when v_document_confidence > 0
            then round(
              15 * v_document_confidence / 100.0
            )::integer
          else 0
        end
      )
    );

  if jsonb_typeof(v_selfie_media) = 'object'
     and v_selfie_media <> '{}'::jsonb then
    v_assets :=
      v_assets || jsonb_build_array(v_selfie_media);
  elsif jsonb_typeof(v_selfie_media) = 'array' then
    v_assets := v_assets || v_selfie_media;
  end if;

  if jsonb_typeof(v_workplace_media) = 'object'
     and v_workplace_media <> '{}'::jsonb then
    v_assets :=
      v_assets || jsonb_build_array(v_workplace_media);
  elsif jsonb_typeof(v_workplace_media) = 'array' then
    v_assets := v_assets || v_workplace_media;
  end if;

  if jsonb_typeof(v_business_media) = 'array' then
    v_assets := v_assets || v_business_media;
  end if;

  for v_asset in
    select value
    from jsonb_array_elements(v_assets)
  loop
    if lower(coalesce(
      v_asset ->> 'captureSource',
      v_asset ->> 'capture_source',
      ''
    )) = 'live_camera' then
      v_capture_count := v_capture_count + 1;
      v_capture_metadata :=
        coalesce(
          v_asset -> 'captureMetadata',
          v_asset -> 'capture_metadata',
          '{}'::jsonb
        );

      if coalesce(
        v_asset ->> 'evidenceBindingSha256',
        v_asset ->> 'evidence_binding_sha256',
        ''
      ) <> ''
      and jsonb_typeof(v_capture_metadata) = 'object'
      and v_capture_metadata <> '{}'::jsonb then
        v_bound_capture_count :=
          v_bound_capture_count + 1;
      end if;

      if lower(coalesce(
        v_capture_metadata ->> 'mocked',
        'false'
      )) = 'true' then
        v_mocked_capture_count :=
          v_mocked_capture_count + 1;
      end if;

      begin
        if coalesce(
          nullif(
            v_capture_metadata ->> 'locationAgeMs',
            ''
          )::numeric,
          0
        ) > 60000 then
          v_stale_capture_count :=
            v_stale_capture_count + 1;
        end if;
      exception
        when invalid_text_representation then
          v_stale_capture_count :=
            v_stale_capture_count + 1;
      end;

      begin
        if coalesce(
          nullif(
            v_capture_metadata ->> 'accuracy',
            ''
          )::numeric,
          999999
        ) > 100 then
          v_inaccurate_capture_count :=
            v_inaccurate_capture_count + 1;
        end if;
      exception
        when invalid_text_representation then
          v_inaccurate_capture_count :=
            v_inaccurate_capture_count + 1;
      end;
    end if;
  end loop;

  v_capture_integrity_trust :=
    case
      when not v_business_required then 100
      when v_mocked_capture_count > 0 then 0
      when v_capture_count = 0
           and v_selfie_present
           and v_workplace_present
           and v_selfie_status = 'verified'
           and v_workplace_status = 'verified'
        then 70
      when v_capture_count = 0 then 20
      else greatest(
        0,
        least(
          100,
          round(
            100.0
            * v_bound_capture_count
            / greatest(v_capture_count, 1)
          )::integer
          - (v_stale_capture_count * 25)
          - (v_inaccurate_capture_count * 25)
        )
      )
    end;

  v_business_activity_trust :=
    case
      when not v_business_required then 100
      when not v_business_exists then 0
      when v_business_complete
           and v_registration_complete then 100
      when v_business_complete then 80
      else 40
    end;

  v_overall_trust :=
    greatest(
      0,
      least(
        100,
        round(
          (
            v_identity_trust * 0.20
            + v_location_trust * 0.20
            + v_evidence_trust * 0.30
            + v_capture_integrity_trust * 0.20
            + v_business_activity_trust * 0.10
          )
        )::integer
      )
    );

  if v_registration_status = 'restricted'
     or v_mocked_capture_count > 0 then
    v_risk_level := 'CRITICAL';
    v_recommended_action := 'RESTRICT_AND_REVIEW';
  elsif v_registration_status = 'correction_required' then
    v_risk_level := 'HIGH';
    v_recommended_action := 'REQUEST_CORRECTION';
  elsif v_registration_status = 'admin_review_required' then
    v_risk_level := 'HIGH';
    v_recommended_action := 'MANUAL_REVIEW';
  elsif v_registration_status in (
    'auto_verified',
    'admin_verified'
  ) then
    v_risk_level :=
      case
        when v_overall_trust >= 85 then 'LOW'
        else 'MEDIUM'
      end;
    v_recommended_action :=
      case
        when v_overall_trust >= 85
          then 'AUTOMATED_PATH_ELIGIBLE'
        else 'VERIFIED_MONITORING'
      end;
  elsif v_registration_status = 'evidence_incomplete' then
    v_risk_level := 'MEDIUM';
    v_recommended_action := 'REQUEST_MORE_EVIDENCE';
  elsif v_overall_trust < 65 then
    v_risk_level := 'HIGH';
    v_recommended_action := 'MANUAL_REVIEW';
  elsif v_overall_trust < 85 then
    v_risk_level := 'MEDIUM';
    v_recommended_action := 'REQUEST_MORE_EVIDENCE';
  else
    v_risk_level := 'LOW';
    v_recommended_action :=
      'AUTOMATED_PATH_ELIGIBLE';
  end if;

  v_explanations :=
    jsonb_build_array(
      format(
        'Identity trust is %s/100 based on canonical onboarding and business-profile completion.',
        v_identity_trust
      ),
      format(
        'Location trust is %s/100 from the authoritative location verification status.',
        v_location_trust
      ),
      format(
        'Evidence trust is %s/100 from selfie, workplace and document evidence.',
        v_evidence_trust
      ),
      format(
        'Capture integrity is %s/100 across %s live capture(s); %s are cryptographically bound.',
        v_capture_integrity_trust,
        v_capture_count,
        v_bound_capture_count
      ),
      format(
        'Business activity trust is %s/100 from business registration completion.',
        v_business_activity_trust
      )
    )
    ||
    case
      when v_mocked_capture_count > 0
        then jsonb_build_array(
          'One or more live captures report a mocked location.'
        )
      else '[]'::jsonb
    end
    ||
    case
      when v_stale_capture_count > 0
        then jsonb_build_array(
          'One or more live captures contain stale location metadata.'
        )
      else '[]'::jsonb
    end
    ||
    case
      when v_inaccurate_capture_count > 0
        then jsonb_build_array(
          'One or more live captures exceed the accepted GPS accuracy threshold.'
        )
      else '[]'::jsonb
    end;

  v_result :=
    jsonb_build_object(
      'policyVersion',
        'registration_trust_intelligence_v1',
      'advisoryOnly',
        true,
      'authoritativeVerification',
        jsonb_build_object(
          'status',
            v_registration_status,
          'score',
            v_authoritative_score,
          'reasons',
            v_authoritative_reasons
        ),
      'overallTrust',
        v_overall_trust,
      'identityTrust',
        v_identity_trust,
      'locationTrust',
        v_location_trust,
      'evidenceTrust',
        v_evidence_trust,
      'captureIntegrityTrust',
        v_capture_integrity_trust,
      'businessActivityTrust',
        v_business_activity_trust,
      'riskLevel',
        v_risk_level,
      'recommendedAction',
        v_recommended_action,
      'captureFacts',
        jsonb_build_object(
          'liveCaptureCount',
            v_capture_count,
          'boundCaptureCount',
            v_bound_capture_count,
          'mockedCaptureCount',
            v_mocked_capture_count,
          'staleCaptureCount',
            v_stale_capture_count,
          'inaccurateCaptureCount',
            v_inaccurate_capture_count
        ),
      'explanations',
        v_explanations,
      'evaluatedAt',
        now()
    );

  if v_business_exists then
    update public.business_profiles
       set automated_verification_json =
             coalesce(
               automated_verification_json,
               '{}'::jsonb
             )
             ||
             jsonb_build_object(
               'trustIntelligence',
               v_result
             ),
           updated_at = now()
     where user_id = v_user_id;
  end if;

  return v_result;
end;
$function$;

alter function
  public.evaluate_registration_trust_intelligence()
  owner to postgres;

revoke all on function
  public.evaluate_registration_trust_intelligence()
  from public;

revoke all on function
  public.evaluate_registration_trust_intelligence()
  from anon;

grant execute on function
  public.evaluate_registration_trust_intelligence()
  to authenticated;

grant execute on function
  public.evaluate_registration_trust_intelligence()
  to service_role;

commit;
