alter table rfqs
  add column if not exists geo_state_id uuid,
  add column if not exists geo_district_id uuid,
  add column if not exists geo_subdivision_id uuid,
  add column if not exists geo_block_id uuid,
  add column if not exists geo_place_id uuid;

create index if not exists idx_rfqs_geo_state
on rfqs (geo_state_id);

create index if not exists idx_rfqs_geo_district
on rfqs (geo_district_id);

create index if not exists idx_rfqs_geo_block
on rfqs (geo_block_id);

create index if not exists idx_rfqs_geo_place
on rfqs (geo_place_id);
