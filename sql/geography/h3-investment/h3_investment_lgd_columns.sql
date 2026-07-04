alter table public.investment_opportunities
add column if not exists geo_state_id uuid null,
add column if not exists geo_district_id uuid null,
add column if not exists geo_subdivision_id uuid null,
add column if not exists geo_block_id uuid null,
add column if not exists geo_place_id uuid null;

create index if not exists idx_investment_opportunities_geo_state
on public.investment_opportunities (geo_state_id);

create index if not exists idx_investment_opportunities_geo_district
on public.investment_opportunities (geo_district_id);

create index if not exists idx_investment_opportunities_geo_place
on public.investment_opportunities (geo_place_id);
