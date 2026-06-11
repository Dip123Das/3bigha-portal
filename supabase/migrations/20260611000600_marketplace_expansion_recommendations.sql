create table if not exists marketplace_expansion_recommendations (
  id uuid primary key default gen_random_uuid(),

  module text not null,
  category text,

  geo_state_id uuid,
  geo_district_id uuid,
  geo_subdivision_id uuid,
  geo_block_id uuid,
  geo_place_id uuid,

  growth_score integer not null default 0,
  shortage_score integer not null default 0,
  expansion_score integer not null default 0,

  recommendation text not null default 'stable',
  reason text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_expansion_recommendations_module
on marketplace_expansion_recommendations (module);

create index if not exists idx_marketplace_expansion_recommendations_recommendation
on marketplace_expansion_recommendations (recommendation);

create index if not exists idx_marketplace_expansion_recommendations_score
on marketplace_expansion_recommendations (expansion_score);

create index if not exists idx_marketplace_expansion_recommendations_geo
on marketplace_expansion_recommendations (
  geo_state_id,
  geo_district_id,
  geo_block_id
);
