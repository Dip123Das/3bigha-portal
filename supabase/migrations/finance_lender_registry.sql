create table if not exists public.finance_lender_registry (
  id uuid primary key default gen_random_uuid(),

  lender_name text not null,
  lender_type text not null,

  bank_code text,
  ifsc_prefix text,

  head_office_state text,

  is_active boolean not null default true,
  is_verified boolean not null default false,

  created_by uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_lender_registry_name_idx
on public.finance_lender_registry (lender_name);

create index if not exists finance_lender_registry_type_idx
on public.finance_lender_registry (lender_type);

alter table public.finance_lender_registry enable row level security;

drop policy if exists "Public lender registry readable"
on public.finance_lender_registry;

create policy "Public lender registry readable"
on public.finance_lender_registry
for select
using (true);