create table if not exists public.finance_loan_leads (
  id uuid primary key default gen_random_uuid(),

  name text,
  phone text,
  email text,

  loan_purpose text,
  state text,
  district text,

  monthly_income numeric,
  co_applicant_income numeric,
  existing_emi numeric,
  cibil_score integer,

  eligible_loan numeric,
  estimated_property_budget numeric,
  preferred_bank text,

  source text not null default 'emi-calculator',
  status text not null default 'new',

  created_at timestamptz not null default now()
);

create index if not exists finance_loan_leads_status_idx
on public.finance_loan_leads (status, created_at desc);

alter table public.finance_loan_leads enable row level security;

drop policy if exists "Anyone can create finance lead"
on public.finance_loan_leads;

create policy "Anyone can create finance lead"
on public.finance_loan_leads
for insert
with check (true);