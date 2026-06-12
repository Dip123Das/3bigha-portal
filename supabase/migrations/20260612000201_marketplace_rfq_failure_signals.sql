create table if not exists marketplace_rfq_failure_signals (
  id uuid primary key default gen_random_uuid(),

  rfq_id uuid,

  module text not null,

  geo_state_id uuid,
  geo_district_id uuid,
  geo_subdivision_id uuid,
  geo_block_id uuid,
  geo_place_id uuid,

  failure_reason text not null,
  severity text not null default 'medium',

  created_at timestamptz not null default now()
);

create index if not exists marketplace_rfq_failure_module_idx
on marketplace_rfq_failure_signals(module);
