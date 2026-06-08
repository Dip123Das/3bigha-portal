alter table public.provider_services
add column if not exists currency text default 'INR';

alter table public.provider_services
add column if not exists pricing_unit text default 'fixed';

alter table public.provider_services
add column if not exists price numeric default 0;

alter table public.provider_services
add column if not exists service_radius_km numeric default 0;

alter table public.provider_services
add column if not exists experience_years integer default 0;

alter table public.provider_services
add column if not exists response_time text default 'Standard';

alter table public.provider_services
add column if not exists availability_status text default 'available';
