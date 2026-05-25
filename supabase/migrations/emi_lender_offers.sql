create extension if not exists pgcrypto;

create table if not exists public.finance_lender_offers (
  id uuid primary key default gen_random_uuid(),

  lender_name text not null,
  lender_type text not null default 'bank',

  state text,
  district text,

  product_type text not null default 'home',

  min_roi numeric(5,2) not null,
  max_roi numeric(5,2),

  processing_fee_percent numeric(5,2),

  min_cibil integer,
  max_foir_percent integer,
  max_tenure_years integer,
  ltv_percent integer,

  terms_note text,

  is_active boolean not null default true,
  is_verified boolean not null default false,

  updated_by uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_lender_offers_active_idx
on public.finance_lender_offers (
  is_active,
  is_verified,
  product_type,
  state
);

alter table public.finance_lender_offers
enable row level security;

drop policy if exists
"Public can read active verified lender offers"
on public.finance_lender_offers;

create policy
"Public can read active verified lender offers"
on public.finance_lender_offers
for select
using (
  is_active = true
  and is_verified = true
);