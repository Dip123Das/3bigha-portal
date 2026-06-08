alter table public.provider_services
add column if not exists min_price numeric default 0;

alter table public.provider_services
add column if not exists max_price numeric default 0;
