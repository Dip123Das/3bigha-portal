-- Phase 6A.3 Marketplace Geography IDs
-- Safe additive migration.
-- Keeps existing text fields like state, district, city, locality, location, service_area.

alter table if exists public.property_listings
  add column if not exists geo_state_id uuid references public.geo_states(id) on delete set null,
  add column if not exists geo_district_id uuid references public.geo_districts(id) on delete set null,
  add column if not exists geo_subdivision_id uuid references public.geo_subdivisions(id) on delete set null,
  add column if not exists geo_block_id uuid references public.geo_blocks(id) on delete set null,
  add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;

alter table if exists public.material_listings
  add column if not exists geo_state_id uuid references public.geo_states(id) on delete set null,
  add column if not exists geo_district_id uuid references public.geo_districts(id) on delete set null,
  add column if not exists geo_subdivision_id uuid references public.geo_subdivisions(id) on delete set null,
  add column if not exists geo_block_id uuid references public.geo_blocks(id) on delete set null,
  add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;

alter table if exists public.service_listings
  add column if not exists geo_state_id uuid references public.geo_states(id) on delete set null,
  add column if not exists geo_district_id uuid references public.geo_districts(id) on delete set null,
  add column if not exists geo_subdivision_id uuid references public.geo_subdivisions(id) on delete set null,
  add column if not exists geo_block_id uuid references public.geo_blocks(id) on delete set null,
  add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;

alter table if exists public.rental_listings
  add column if not exists geo_state_id uuid references public.geo_states(id) on delete set null,
  add column if not exists geo_district_id uuid references public.geo_districts(id) on delete set null,
  add column if not exists geo_subdivision_id uuid references public.geo_subdivisions(id) on delete set null,
  add column if not exists geo_block_id uuid references public.geo_blocks(id) on delete set null,
  add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;

alter table if exists public.business_profiles
  add column if not exists geo_state_id uuid references public.geo_states(id) on delete set null,
  add column if not exists geo_district_id uuid references public.geo_districts(id) on delete set null,
  add column if not exists geo_subdivision_id uuid references public.geo_subdivisions(id) on delete set null,
  add column if not exists geo_block_id uuid references public.geo_blocks(id) on delete set null,
  add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;

create index if not exists property_listings_geo_state_idx on public.property_listings(geo_state_id);
create index if not exists property_listings_geo_district_idx on public.property_listings(geo_district_id);
create index if not exists property_listings_geo_place_idx on public.property_listings(geo_place_id);

create index if not exists material_listings_geo_state_idx on public.material_listings(geo_state_id);
create index if not exists material_listings_geo_district_idx on public.material_listings(geo_district_id);
create index if not exists material_listings_geo_place_idx on public.material_listings(geo_place_id);

create index if not exists service_listings_geo_state_idx on public.service_listings(geo_state_id);
create index if not exists service_listings_geo_district_idx on public.service_listings(geo_district_id);
create index if not exists service_listings_geo_place_idx on public.service_listings(geo_place_id);

create index if not exists rental_listings_geo_state_idx on public.rental_listings(geo_state_id);
create index if not exists rental_listings_geo_district_idx on public.rental_listings(geo_district_id);
create index if not exists rental_listings_geo_place_idx on public.rental_listings(geo_place_id);

create index if not exists business_profiles_geo_state_idx on public.business_profiles(geo_state_id);
create index if not exists business_profiles_geo_district_idx on public.business_profiles(geo_district_id);
create index if not exists business_profiles_geo_place_idx on public.business_profiles(geo_place_id);
