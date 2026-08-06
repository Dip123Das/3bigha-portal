begin;

alter table public.individual_professional_profiles
  add column if not exists original_name_declared text,
  add column if not exists original_name_warning_accepted boolean not null default false,
  add column if not exists original_name_warning_accepted_at timestamptz,

  add column if not exists identity_document_type text,
  add column if not exists identity_document_masked_reference text,
  add column if not exists identity_document_storage_path text,
  add column if not exists identity_document_verification_status text
    not null default 'not_submitted'
    check (
      identity_document_verification_status in (
        'not_submitted',
        'uploaded',
        'pending_review',
        'verified',
        'needs_correction',
        'rejected'
      )
    ),

  add column if not exists identity_name_extracted text,
  add column if not exists identity_name_match_status text
    not null default 'not_checked'
    check (
      identity_name_match_status in (
        'not_checked',
        'matched',
        'possible_match',
        'mismatch',
        'human_review'
      )
    ),

  add column if not exists identity_document_consent_at timestamptz,
  add column if not exists identity_document_consent_version text,

  add column if not exists verified_selfie_json jsonb
    not null default '{}'::jsonb,

  add column if not exists work_photo_one_json jsonb
    not null default '{}'::jsonb,

  add column if not exists work_photo_two_json jsonb
    not null default '{}'::jsonb,

  add column if not exists selfie_verification_status text
    not null default 'not_started'
    check (
      selfie_verification_status in (
        'not_started',
        'captured',
        'pending_review',
        'verified',
        'needs_correction',
        'rejected'
      )
    ),

  add column if not exists work_evidence_verification_status text
    not null default 'not_started'
    check (
      work_evidence_verification_status in (
        'not_started',
        'incomplete',
        'pending_review',
        'verified',
        'needs_correction',
        'rejected'
      )
    );

alter table public.individual_professional_profiles
  drop constraint if exists
    individual_professional_original_name_warning_guard;

alter table public.individual_professional_profiles
  add constraint individual_professional_original_name_warning_guard
  check (
    original_name_warning_accepted = false
    or (
      nullif(trim(original_name_declared), '') is not null
      and original_name_warning_accepted_at is not null
    )
  );

alter table public.individual_professional_profiles
  drop constraint if exists
    individual_professional_identity_consent_guard;

alter table public.individual_professional_profiles
  add constraint individual_professional_identity_consent_guard
  check (
    identity_document_type is null
    or (
      identity_document_consent_at is not null
      and nullif(trim(identity_document_consent_version), '') is not null
    )
  );

comment on column
  public.individual_professional_profiles.identity_document_storage_path
is
  'Private verification-document storage path. Never expose in public profile projections.';

comment on column
  public.individual_professional_profiles.verified_selfie_json
is
  'Trusted live-camera selfie metadata. This verified selfie becomes the canonical profile photograph.';

comment on column
  public.individual_professional_profiles.work_photo_one_json
is
  'First mandatory live-camera skill-evidence photograph.';

comment on column
  public.individual_professional_profiles.work_photo_two_json
is
  'Second mandatory live-camera skill-evidence photograph.';

commit;
