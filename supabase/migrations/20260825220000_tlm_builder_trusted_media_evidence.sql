begin;

alter table public.builder_projects
  add column if not exists trusted_media_json jsonb
  not null
  default '[]'::jsonb;

comment on column public.builder_projects.trusted_media_json is
  'Canonical Trusted Listing Media evidence for the builder project. Preserves live capture, GPS, provenance, capture-session and AI-review metadata. Legacy builder_project_media remains the gallery projection.';

alter table public.builder_projects
  add constraint builder_projects_trusted_media_json_array
  check (
    jsonb_typeof(trusted_media_json) = 'array'
  )
  not valid;

alter table public.builder_projects
  validate constraint builder_projects_trusted_media_json_array;

commit;
