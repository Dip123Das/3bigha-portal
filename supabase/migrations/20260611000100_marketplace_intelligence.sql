create table if not exists marketplace_demand_signals (
  id uuid primary key default gen_random_uuid(),

  geo_state_id uuid,
  geo_district_id uuid,
  geo_subdivision_id uuid,
  geo_block_id uuid,
  geo_place_id uuid,

  module text not null,
  category text,

  searches integer not null default 0,
  rfqs integer not null default 0,
  enquiries integer not null default 0,

  demand_score integer not null default 0,
  demand_level text not null default 'low',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketplace_supply_signals (
  id uuid primary key default gen_random_uuid(),

  geo_state_id uuid,
  geo_district_id uuid,
  geo_subdivision_id uuid,
  geo_block_id uuid,
  geo_place_id uuid,

  module text not null,
  category text,

  vendors integer not null default 0,
  listings integer not null default 0,

  supply_score integer not null default 0,
  supply_level text not null default 'scarce',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketplace_gap_analysis (
  id uuid primary key default gen_random_uuid(),

  geo_state_id uuid,
  geo_district_id uuid,
  geo_subdivision_id uuid,
  geo_block_id uuid,
  geo_place_id uuid,

  module text not null,
  category text,

  demand_score integer not null,
  supply_score integer not null,

  gap_score integer not null,
  opportunity_score integer not null,

  classification text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketplace_opportunity_zones (
  id uuid primary key default gen_random_uuid(),

  geo_state_id uuid,
  geo_district_id uuid,
  geo_subdivision_id uuid,
  geo_block_id uuid,
  geo_place_id uuid,

  module text not null,
  category text,

  opportunity_score integer not null,
  priority text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_demand_geo
on marketplace_demand_signals (
  geo_state_id,
  geo_district_id
);

create index if not exists idx_marketplace_supply_geo
on marketplace_supply_signals (
  geo_state_id,
  geo_district_id
);

create index if not exists idx_marketplace_gap_geo
on marketplace_gap_analysis (
  geo_state_id,
  geo_district_id
);

create index if not exists idx_marketplace_opportunity_geo
on marketplace_opportunity_zones (
  geo_state_id,
  geo_district_id
);
