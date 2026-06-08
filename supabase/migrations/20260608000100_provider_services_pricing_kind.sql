alter table public.provider_services
add column if not exists pricing_kind text default 'fixed';
