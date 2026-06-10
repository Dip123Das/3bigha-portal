alter table public.business_profiles
add column if not exists preferred_geo_districts jsonb default '[]'::jsonb,
add column if not exists preferred_geo_subdivisions jsonb default '[]'::jsonb,
add column if not exists preferred_geo_blocks jsonb default '[]'::jsonb,
add column if not exists preferred_geo_places jsonb default '[]'::jsonb;
