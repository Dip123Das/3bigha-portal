alter table public.business_profiles
  add column if not exists reputation_score numeric default 0,
  add column if not exists authority_score numeric default 0,
  add column if not exists conversion_rate numeric default 0,
  add column if not exists response_rate numeric default 0,
  add column if not exists activity_score numeric default 0,
  add column if not exists demand_score numeric default 0,
  add column if not exists liquidity_score numeric default 0,
  add column if not exists marketplace_intelligence_updated_at timestamptz;
