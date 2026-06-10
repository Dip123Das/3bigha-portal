-- Phase 6A.14 Vendor Radius Engine
-- Adds vendor service-radius controls for geography-aware RFQ routing.

alter table public.business_profiles
add column if not exists delivery_radius_km numeric,
add column if not exists preferred_service_area text,
add column if not exists statewide_service boolean default false,
add column if not exists nationwide_service boolean default false;

create index if not exists idx_business_profiles_delivery_radius
on public.business_profiles (delivery_radius_km);

create index if not exists idx_business_profiles_statewide_service
on public.business_profiles (statewide_service);

create index if not exists idx_business_profiles_nationwide_service
on public.business_profiles (nationwide_service);
