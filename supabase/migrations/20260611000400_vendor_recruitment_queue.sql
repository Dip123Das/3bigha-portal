create table if not exists marketplace_vendor_recruitment_queue (
  id uuid primary key default gen_random_uuid(),

  module text not null,
  category text,

  geo_state_id uuid,
  geo_district_id uuid,
  geo_subdivision_id uuid,
  geo_block_id uuid,
  geo_place_id uuid,

  opportunity_score integer not null default 0,
  shortage_score integer not null default 0,
  recommended_vendor_count integer not null default 1,

  priority text not null default 'low',
  reason text not null,
  status text not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_recruitment_queue_status
on marketplace_vendor_recruitment_queue (status);

create index if not exists idx_vendor_recruitment_queue_priority
on marketplace_vendor_recruitment_queue (priority);

create index if not exists idx_vendor_recruitment_queue_geo
on marketplace_vendor_recruitment_queue (
  geo_state_id,
  geo_district_id,
  geo_block_id
);
