-- Human-First Business Identity Builder
-- Adds user-authored narrative fields to canonical business profiles.
--
-- AI may improve the user's writing, but the final accepted text remains
-- explicitly controlled and saved by the user.

alter table public.business_profiles
  add column if not exists about_person text,
  add column if not exists about_business text;

comment on column public.business_profiles.about_person is
  'User-approved personal introduction. AI assistance may improve wording but must not invent facts.';

comment on column public.business_profiles.about_business is
  'User-approved business introduction. AI assistance may improve wording but must not invent facts.';
