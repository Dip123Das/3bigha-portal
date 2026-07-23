-- G6 National Address Engine
-- Backend-only schema. No UI rollout.

create table if not exists public.geo_lgd_states (
  id bigserial primary key,
  lgd_state_code integer not null unique,
  name_en text not null,
  name_local text,
  slug text not null unique,
  is_active boolean not null default true,
  source text not null default 'LGD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.geo_lgd_districts (
  id bigserial primary key,
  lgd_district_code integer not null unique,
  lgd_state_code integer not null references public.geo_lgd_states(lgd_state_code),
  district_version integer,
  name_en text not null,
  name_local text,
  census_2001_code text,
  census_2011_code text,
  slug text not null,
  is_active boolean not null default true,
  source text not null default 'LGD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lgd_state_code, slug)
);

create table if not exists public.geo_lgd_subdistricts (
  id bigserial primary key,
  lgd_subdistrict_code integer not null unique,
  lgd_district_code integer not null references public.geo_lgd_districts(lgd_district_code),
  subdistrict_version integer,
  name_en text not null,
  name_local text,
  census_2001_code text,
  census_2011_code text,
  slug text not null,
  is_active boolean not null default true,
  source text not null default 'LGD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lgd_district_code, slug)
);

create table if not exists public.geo_lgd_blocks (
  id bigserial primary key,
  lgd_block_code integer not null unique,
  lgd_district_code integer not null references public.geo_lgd_districts(lgd_district_code),
  block_version integer,
  name_en text not null,
  name_local text,
  slug text not null,
  is_active boolean not null default true,
  source text not null default 'LGD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lgd_district_code, slug)
);

create table if not exists public.geo_lgd_local_bodies (
  id bigserial primary key,
  lgd_local_body_code integer not null unique,
  local_body_version integer,
  local_body_type_code integer,
  local_body_type_name text,
  local_body_category text not null check (
    local_body_category in ('PRI', 'URBAN', 'TRADITIONAL')
  ),
  parent_local_body_code integer,
  name_en text not null,
  name_local text,
  slug text not null,
  is_active boolean not null default true,
  source text not null default 'LGD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.geo_lgd_block_villages (
  id bigserial primary key,
  lgd_block_code integer not null references public.geo_lgd_blocks(lgd_block_code),
  lgd_village_code integer not null,
  lgd_district_code integer,
  lgd_state_code integer,
  block_name_en text,
  village_name_en text,
  source text not null default 'LGD',
  created_at timestamptz not null default now(),
  unique (lgd_block_code, lgd_village_code)
);

create table if not exists public.geo_lgd_villages (
  id bigserial primary key,
  lgd_village_code integer not null unique,
  village_version integer,
  lgd_district_code integer not null references public.geo_lgd_districts(lgd_district_code),
  lgd_subdistrict_code integer references public.geo_lgd_subdistricts(lgd_subdistrict_code),
  lgd_block_code integer references public.geo_lgd_blocks(lgd_block_code),
  lgd_gram_panchayat_code integer,
  name_en text not null,
  name_local text,
  village_status text,
  census_2001_code text,
  census_2011_code text,
  remark text,
  slug text not null,
  is_active boolean not null default true,
  source text not null default 'LGD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lgd_subdistrict_code, slug)
);

create table if not exists public.geo_lgd_wards (
  id bigserial primary key,
  lgd_ward_code integer not null unique,
  ward_number text,
  ward_name_en text not null,
  ward_name_local text,
  ward_category text not null check (
    ward_category in ('PRI', 'URBAN')
  ),
  lgd_local_body_code integer references public.geo_lgd_local_bodies(lgd_local_body_code),
  local_body_name_en text,
  local_body_type_name text,
  district_level_parent_name text,
  intermediate_level_parent_name text,
  slug text not null,
  is_active boolean not null default true,
  source text not null default 'LGD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.geo_lgd_pincodes (
  id bigserial primary key,
  pincode char(6) not null unique,
  circle_name text,
  region_name text,
  division_name text,
  office_name text,
  office_type text,
  delivery_status text,
  district_name text,
  state_name text,
  latitude numeric,
  longitude numeric,
  source text not null default 'INDIA_POST',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.geo_lgd_place_pincodes (
  id bigserial primary key,
  pincode char(6) not null references public.geo_lgd_pincodes(pincode),
  place_kind text not null check (
    place_kind in ('VILLAGE', 'WARD', 'LOCAL_BODY', 'SUBDISTRICT', 'DISTRICT')
  ),
  lgd_village_code integer references public.geo_lgd_villages(lgd_village_code),
  lgd_ward_code integer references public.geo_lgd_wards(lgd_ward_code),
  lgd_local_body_code integer references public.geo_lgd_local_bodies(lgd_local_body_code),
  lgd_subdistrict_code integer references public.geo_lgd_subdistricts(lgd_subdistrict_code),
  lgd_district_code integer references public.geo_lgd_districts(lgd_district_code),
  confidence text not null default 'manual' check (
    confidence in ('official', 'high', 'medium', 'manual')
  ),
  source text not null default 'MANUAL',
  created_at timestamptz not null default now()
);

create table if not exists public.geo_lgd_import_runs (
  id bigserial primary key,
  importer_name text not null,
  source_folder text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (
    status in ('running', 'success', 'failed')
  ),
  summary jsonb not null default '{}'::jsonb,
  error_message text
);

create index if not exists idx_geo_lgd_districts_state
  on public.geo_lgd_districts(lgd_state_code);

create index if not exists idx_geo_lgd_subdistricts_district
  on public.geo_lgd_subdistricts(lgd_district_code);

create index if not exists idx_geo_lgd_blocks_district
  on public.geo_lgd_blocks(lgd_district_code);

create index if not exists idx_geo_lgd_villages_district
  on public.geo_lgd_villages(lgd_district_code);

create index if not exists idx_geo_lgd_villages_subdistrict
  on public.geo_lgd_villages(lgd_subdistrict_code);

create index if not exists idx_geo_lgd_villages_block
  on public.geo_lgd_villages(lgd_block_code);

create index if not exists idx_geo_lgd_local_bodies_category
  on public.geo_lgd_local_bodies(local_body_category);

create index if not exists idx_geo_lgd_wards_local_body
  on public.geo_lgd_wards(lgd_local_body_code);

create index if not exists idx_geo_lgd_place_pincodes_pincode
  on public.geo_lgd_place_pincodes(pincode);

alter table public.geo_lgd_states enable row level security;
alter table public.geo_lgd_districts enable row level security;
alter table public.geo_lgd_subdistricts enable row level security;
alter table public.geo_lgd_blocks enable row level security;
alter table public.geo_lgd_local_bodies enable row level security;
alter table public.geo_lgd_block_villages enable row level security;
alter table public.geo_lgd_villages enable row level security;
alter table public.geo_lgd_wards enable row level security;
alter table public.geo_lgd_pincodes enable row level security;
alter table public.geo_lgd_place_pincodes enable row level security;
alter table public.geo_lgd_import_runs enable row level security;

drop policy if exists "Public read geo_lgd_states"
on public.geo_lgd_states;

create policy "Public read geo_lgd_states"
on public.geo_lgd_states for select
using (true);

drop policy if exists "Public read geo_lgd_districts"
on public.geo_lgd_districts;

create policy "Public read geo_lgd_districts"
on public.geo_lgd_districts for select
using (true);

drop policy if exists "Public read geo_lgd_subdistricts"
on public.geo_lgd_subdistricts;

create policy "Public read geo_lgd_subdistricts"
on public.geo_lgd_subdistricts for select
using (true);

drop policy if exists "Public read geo_lgd_blocks"
on public.geo_lgd_blocks;

create policy "Public read geo_lgd_blocks"
on public.geo_lgd_blocks for select
using (true);

drop policy if exists "Public read geo_lgd_local_bodies"
on public.geo_lgd_local_bodies;

create policy "Public read geo_lgd_local_bodies"
on public.geo_lgd_local_bodies for select
using (true);

drop policy if exists "Public read geo_lgd_block_villages"
on public.geo_lgd_block_villages;

create policy "Public read geo_lgd_block_villages"
on public.geo_lgd_block_villages for select
using (true);

drop policy if exists "Public read geo_lgd_villages"
on public.geo_lgd_villages;

create policy "Public read geo_lgd_villages"
on public.geo_lgd_villages for select
using (true);

drop policy if exists "Public read geo_lgd_wards"
on public.geo_lgd_wards;

create policy "Public read geo_lgd_wards"
on public.geo_lgd_wards for select
using (true);

drop policy if exists "Public read geo_lgd_pincodes"
on public.geo_lgd_pincodes;

create policy "Public read geo_lgd_pincodes"
on public.geo_lgd_pincodes for select
using (true);

drop policy if exists "Public read geo_lgd_place_pincodes"
on public.geo_lgd_place_pincodes;

create policy "Public read geo_lgd_place_pincodes"
on public.geo_lgd_place_pincodes for select
using (true);