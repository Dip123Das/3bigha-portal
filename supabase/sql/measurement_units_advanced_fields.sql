alter table public.measurement_units
add column if not exists unit_category text,
add column if not exists common_usage text,
add column if not exists hierarchy_relation text,
add column if not exists confidence_level text,
add column if not exists search_keywords text[];

create index if not exists measurement_units_search_keywords_idx
on public.measurement_units
using gin (search_keywords);
