-- =========================================================
-- G10.5 CANONICAL INDIA POST ENGINE
-- Purpose:
-- Deduplicate India Post office rows into one canonical row per:
-- district + normalized office name + pincode
-- =========================================================

create table if not exists public.geo_post_offices_canonical (
  id bigserial primary key,
  state_name text,
  district_name text,
  office_name text,
  normalized_district_name text,
  normalized_office_name text,
  pincode text not null,
  office_type text,
  delivery_status text,
  source_rows integer default 1,
  source text default 'g10_canonical_from_geo_post_offices',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists uq_geo_post_offices_canonical_key
on public.geo_post_offices_canonical (
  normalized_district_name,
  normalized_office_name,
  pincode
);

truncate table public.geo_post_offices_canonical;

insert into public.geo_post_offices_canonical (
  state_name,
  district_name,
  office_name,
  normalized_district_name,
  normalized_office_name,
  pincode,
  office_type,
  delivery_status,
  source_rows
)
select
  max(state_name) as state_name,
  max(district_name) as district_name,
  max(office_name) as office_name,
  lower(regexp_replace(max(district_name), '[^a-zA-Z0-9]+', '', 'g')) as normalized_district_name,
  lower(
    regexp_replace(
      regexp_replace(max(office_name), '\s*(B\.?O\.?|S\.?O\.?|H\.?O\.?)$', '', 'i'),
      '[^a-zA-Z0-9]+',
      '',
      'g'
    )
  ) as normalized_office_name,
  trim(pincode) as pincode,
  max(office_type) as office_type,
  max(delivery_status) as delivery_status,
  count(*) as source_rows
from public.geo_post_offices
where trim(coalesce(pincode, '')) ~ '^[0-9]{6}$'
  and nullif(trim(coalesce(office_name, '')), '') is not null
  and nullif(trim(coalesce(district_name, '')), '') is not null
group by
  lower(regexp_replace(district_name, '[^a-zA-Z0-9]+', '', 'g')),
  lower(
    regexp_replace(
      regexp_replace(office_name, '\s*(B\.?O\.?|S\.?O\.?|H\.?O\.?)$', '', 'i'),
      '[^a-zA-Z0-9]+',
      '',
      'g'
    )
  ),
  trim(pincode);

select
  count(*) as canonical_rows,
  sum(source_rows) as original_rows_represented
from public.geo_post_offices_canonical;

select
  normalized_district_name,
  normalized_office_name,
  count(distinct pincode) as unique_pins,
  string_agg(distinct pincode, ', ' order by pincode) as pincodes
from public.geo_post_offices_canonical
group by normalized_district_name, normalized_office_name
having count(distinct pincode) > 1
order by unique_pins desc, normalized_district_name, normalized_office_name
limit 50;
