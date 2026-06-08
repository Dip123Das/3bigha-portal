alter table public.provider_services
add column if not exists record_status text default 'active';
