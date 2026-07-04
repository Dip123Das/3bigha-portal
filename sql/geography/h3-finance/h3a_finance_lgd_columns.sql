alter table public.finance_lender_offers
add column if not exists geo_state_id uuid null,
add column if not exists geo_district_id uuid null,
add column if not exists geo_subdivision_id uuid null,
add column if not exists geo_block_id uuid null,
add column if not exists geo_place_id uuid null;

alter table public.finance_loan_leads
add column if not exists geo_state_id uuid null,
add column if not exists geo_district_id uuid null,
add column if not exists geo_subdivision_id uuid null,
add column if not exists geo_block_id uuid null,
add column if not exists geo_place_id uuid null;

create index if not exists idx_finance_lender_offers_geo_state
on public.finance_lender_offers (geo_state_id);

create index if not exists idx_finance_lender_offers_geo_district
on public.finance_lender_offers (geo_district_id);

create index if not exists idx_finance_loan_leads_geo_state
on public.finance_loan_leads (geo_state_id);

create index if not exists idx_finance_loan_leads_geo_district
on public.finance_loan_leads (geo_district_id);
