begin;

-- R3.5B
-- Align the final registration-completion authority with the same
-- canonical evidence model used by onboarding and automated activation.
--
-- Canonical authority:
--   business_media_json
--   vendor_document_verification_json
--
-- Compatibility fallbacks:
--   selfie_media_json
--   workplace_media_json
--   automated_verification_json

create or replace function public.business_registration_evidence_ready(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_catalog
as $function$
  select coalesce(
    (
      select
        case
          when profile.role in (
            'vendor',
            'builder',
            'hub_vendor'
          ) then
            coalesce(business.is_complete, false)

            and lower(
              trim(
                coalesce(
                  business.location_verification_status,
                  ''
                )
              )
            ) = 'verified'

            /*
             * Live-selfie evidence.
             *
             * The canonical business media collection is authoritative.
             * The legacy dedicated column remains a compatibility fallback.
             */
            and (
              (
                business.selfie_media_json is not null
                and business.selfie_media_json <> '{}'::jsonb
                and business.selfie_media_json <> '[]'::jsonb
                and business.selfie_media_json <> 'null'::jsonb
              )
              or exists (
                select 1
                from jsonb_array_elements(
                  case
                    when jsonb_typeof(
                      coalesce(
                        business.business_media_json,
                        '[]'::jsonb
                      )
                    ) = 'array'
                      then coalesce(
                        business.business_media_json,
                        '[]'::jsonb
                      )
                    else '[]'::jsonb
                  end
                ) asset
                where lower(
                  coalesce(
                    asset ->> 'path',
                    asset ->> 'object_path',
                    ''
                  )
                ) like '%/live-selfie/%'
              )
            )

            /*
             * Practical workplace evidence.
             *
             * The canonical business media collection is authoritative.
             * The legacy dedicated column remains a compatibility fallback.
             */
            and (
              (
                business.workplace_media_json is not null
                and business.workplace_media_json <> '{}'::jsonb
                and business.workplace_media_json <> '[]'::jsonb
                and business.workplace_media_json <> 'null'::jsonb
              )
              or exists (
                select 1
                from jsonb_array_elements(
                  case
                    when jsonb_typeof(
                      coalesce(
                        business.business_media_json,
                        '[]'::jsonb
                      )
                    ) = 'array'
                      then coalesce(
                        business.business_media_json,
                        '[]'::jsonb
                      )
                    else '[]'::jsonb
                  end
                ) asset
                where lower(
                  coalesce(
                    asset ->> 'path',
                    asset ->> 'object_path',
                    ''
                  )
                ) like '%/practical-proof/%'
              )
            )

            /*
             * Registration-document verification.
             *
             * Read the dedicated canonical document envelope first.
             * Retain automated_verification_json as the older fallback.
             */
            and lower(
              trim(
                coalesce(
                  business.vendor_document_verification_json
                    ->> 'status',

                  business.vendor_document_verification_json
                    #>> '{documentVerification,status}',

                  business.vendor_document_verification_json
                    #>> '{document_verification,status}',

                  business.automated_verification_json
                    #>> '{documentVerification,status}',

                  business.automated_verification_json
                    #>> '{document_verification,status}',

                  business.automated_verification_json
                    #>> '{document,status}',

                  business.automated_verification_json
                    ->> 'document_verification_status',

                  ''
                )
              )
            ) in (
              'verified_by_ai',
              'verified',
              'matched'
            )

            and coalesce(
              nullif(
                business.vendor_document_verification_json
                  ->> 'confidence',
                ''
              )::numeric,

              nullif(
                business.vendor_document_verification_json
                  #>> '{documentVerification,confidence}',
                ''
              )::numeric,

              nullif(
                business.vendor_document_verification_json
                  #>> '{document_verification,confidence}',
                ''
              )::numeric,

              nullif(
                business.automated_verification_json
                  #>> '{documentVerification,confidence}',
                ''
              )::numeric,

              nullif(
                business.automated_verification_json
                  #>> '{document_verification,confidence}',
                ''
              )::numeric,

              nullif(
                business.automated_verification_json
                  #>> '{document,confidence}',
                ''
              )::numeric,

              nullif(
                business.automated_verification_json
                  ->> 'document_verification_confidence',
                ''
              )::numeric,

              0
            ) >= 85

            and profile.registration_verification_status in (
              'auto_verified',
              'admin_verified'
            )

          else
            /*
             * Non-business identities retain their existing lighter
             * completion contract.
             */
            coalesce(business.is_complete, false)

            and lower(
              trim(
                coalesce(
                  business.location_verification_status,
                  ''
                )
              )
            ) = 'verified'

            and profile.registration_verification_status in (
              'auto_verified',
              'admin_verified'
            )
        end

      from public.business_profiles business

      join public.profiles profile
        on profile.id = business.user_id

      where business.user_id = p_user_id

      limit 1
    ),
    false
  );
$function$;

alter function
  public.business_registration_evidence_ready(uuid)
  owner to postgres;

revoke all on function
  public.business_registration_evidence_ready(uuid)
  from public;

revoke all on function
  public.business_registration_evidence_ready(uuid)
  from anon;

grant execute on function
  public.business_registration_evidence_ready(uuid)
  to authenticated;

grant execute on function
  public.business_registration_evidence_ready(uuid)
  to service_role;

comment on function
  public.business_registration_evidence_ready(uuid)
is
  'Canonical registration-completion authority using business_media_json and vendor_document_verification_json with legacy compatibility fallbacks.';

commit;
