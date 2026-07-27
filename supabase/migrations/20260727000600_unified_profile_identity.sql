-- Unified public profile identity.
-- Registration and verification evidence remains in business_profiles.selfie_media_json.

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists phone_number text,
  add column if not exists profile_photo_url text,
  add column if not exists profile_photo_updated_at timestamptz,
  add column if not exists profile_photo_source text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_profile_photo_source_check'
  ) then
    alter table public.profiles
      add constraint profiles_profile_photo_source_check
      check (
        profile_photo_source is null
        or profile_photo_source in (
          'registration_selfie',
          'camera_capture',
          'gallery_upload'
        )
      );
  end if;
end
$$;

comment on column public.profiles.profile_photo_url is
  'Editable user-facing profile photo. Never replaces registration selfie evidence.';

comment on column public.profiles.profile_photo_source is
  'Source of the editable public profile photo.';
