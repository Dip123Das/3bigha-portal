create table if not exists marketplace_rfq_intelligence (
  id uuid primary key default gen_random_uuid(),

  module text not null,
  category text not null default 'all',

  geo_state_id uuid,
  geo_district_id uuid,
  geo_subdivision_id uuid,
  geo_block_id uuid,
  geo_place_id uuid,

  rfq_count integer not null default 0,
  response_count integer not null default 0,
  failure_count integer not null default 0,

  response_rate numeric not null default 0,
  demand_score integer not null default 0,

  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_rfq_intelligence_module_idx
on marketplace_rfq_intelligence(module);

create index if not exists marketplace_rfq_intelligence_score_idx
on marketplace_rfq_intelligence(demand_score desc);
