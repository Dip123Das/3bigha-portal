begin;

alter table if exists public.provider_services
  add column if not exists media_assets jsonb
    not null
    default '[]'::jsonb,
  add column if not exists trusted_publication jsonb
    not null
    default '{}'::jsonb;

alter table if exists public.provider_turnkey_packages
  add column if not exists media_assets jsonb
    not null
    default '[]'::jsonb,
  add column if not exists trusted_publication jsonb
    not null
    default '{}'::jsonb;

/*
 * Canonical bridge between the provider workspace
 * record and the existing moderated marketplace
 * record.
 */
alter table if exists public.service_listings
  add column if not exists provider_service_id uuid
    references public.provider_services(id)
    on delete cascade;

create unique index if not exists
  service_listings_provider_service_id_uidx
on public.service_listings(provider_service_id)
where provider_service_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'provider_services_media_assets_array'
  ) then
    alter table public.provider_services
      add constraint
        provider_services_media_assets_array
      check (
        jsonb_typeof(media_assets) = 'array'
      )
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'provider_turnkey_packages_media_assets_array'
  ) then
    alter table public.provider_turnkey_packages
      add constraint
        provider_turnkey_packages_media_assets_array
      check (
        jsonb_typeof(media_assets) = 'array'
      )
      not valid;
  end if;
end
$$;

alter table public.provider_services
  validate constraint
    provider_services_media_assets_array;

alter table public.provider_turnkey_packages
  validate constraint
    provider_turnkey_packages_media_assets_array;

comment on column
  public.provider_services.media_assets is
  'Canonical Trusted Listing Media evidence for the general service.';

comment on column
  public.provider_turnkey_packages.media_assets is
  'Canonical Trusted Listing Media evidence for the turnkey package.';

comment on column
  public.provider_services.trusted_publication is
  'Client-facing readiness snapshot only. Server publication authority must recompute from media_assets.';

comment on column
  public.provider_turnkey_packages.trusted_publication is
  'Client-facing readiness snapshot only. Server publication authority must recompute from media_assets.';

commit;
