create table if not exists marketplace_growth_scores (
  id uuid primary key default gen_random_uuid(),

  module text not null,
  category text,

  geo_state_id uuid,
  geo_district_id uuid,
  geo_subdivision_id uuid,
  geo_block_id uuid,
  geo_place_id uuid,

  growth_score integer not null default 0,
  growth_level text not null default 'weak',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_growth_scores_module
on marketplace_growth_scores (module);

create index if not exists idx_marketplace_growth_scores_level
on marketplace_growth_scores (growth_level);

create index if not exists idx_marketplace_growth_scores_geo
on marketplace_growth_scores (
  geo_state_id,
  geo_district_id,
  geo_block_id
);
