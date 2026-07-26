-- Align immutable verification history with the canonical government-document
-- intelligence vocabulary introduced by R3.4A.
--
-- Existing historical values remain accepted for backward compatibility.
-- New verification results use document_mismatch.

alter table public.registration_verification_cases
  drop constraint if exists registration_verification_cases_status_check;

alter table public.registration_verification_cases
  add constraint registration_verification_cases_status_check
  check (
    status in (
      'verified_by_ai',
      'needs_manual_review',
      'needs_document',
      'document_mismatch',
      'format_valid_needs_manual_review',
      'format_valid_document_mismatch',
      'format_invalid'
    )
  );

comment on column public.registration_verification_cases.status is
  'Immutable verification outcome. Canonical values are verified_by_ai, needs_manual_review, needs_document, document_mismatch and format_invalid. Legacy format_valid_* values remain accepted for historical compatibility.';
