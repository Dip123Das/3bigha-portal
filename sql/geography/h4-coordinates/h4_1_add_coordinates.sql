alter table public.geo_states
add column if not exists latitude double precision,
add column if not exists longitude double precision;

alter table public.geo_districts
add column if not exists latitude double precision,
add column if not exists longitude double precision;

alter table public.geo_subdivisions
add column if not exists latitude double precision,
add column if not exists longitude double precision;

alter table public.geo_blocks
add column if not exists latitude double precision,
add column if not exists longitude double precision;

alter table public.geo_places
add column if not exists latitude double precision,
add column if not exists longitude double precision;

create index if not exists idx_geo_states_latlng
on public.geo_states(latitude, longitude);

create index if not exists idx_geo_districts_latlng
on public.geo_districts(latitude, longitude);

create index if not exists idx_geo_subdivisions_latlng
on public.geo_subdivisions(latitude, longitude);

create index if not exists idx_geo_blocks_latlng
on public.geo_blocks(latitude, longitude);

create index if not exists idx_geo_places_latlng
on public.geo_places(latitude, longitude);
