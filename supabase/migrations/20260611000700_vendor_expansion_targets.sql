create table if not exists marketplace_vendor_expansion_targets (
  id uuid primary key default gen_random_uuid(),

  module text not null,
  category text,

  geo_state_id uuid,
  geo_district_id uuid,
  geo_subdivision_id uuid,
  geo_block_id uuid,
  geo_place_id uuid,

  expansion_score integer not null default 0,
  growth_score integer not null default 0,
  shortage_score integer not null default 0,

  recommended_vendor_count integer not null default 1,
  source_vendor_scope text not null default 'district',
  action_status text not null default 'pending',

  reason text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_expansion_targets_status
on marketplace_vendor_expansion_targets (action_status);

create index if not exists idx_vendor_expansion_targets_module
on marketplace_vendor_expansion_targets (module);

create index if not exists idx_vendor_expansion_targets_score
on marketplace_vendor_expansion_targets (expansion_score);

create index if not exists idx_vendor_expansion_targets_geo
on marketplace_vendor_expansion_targets (
  geo_state_id,
  geo_district_id,
  geo_place_id
);
