create table if not exists public.finance_banker_profiles (
  id uuid primary key default gen_random_uuid(),

  user_id uuid,

  full_name text not null,
  bank_name text not null,
  branch_name text not null,
  ifsc_code text not null,
  branch_code text,
  employee_id text not null,
  designation text not null,

  official_email text,
  official_mobile text,

  employee_card_url text,
  id_card_ocr_text text,

  ai_verification_status text not null default 'pending',
  ai_verification_notes text,
  manual_verification_status text not null default 'pending',
  manual_verification_notes text,

  final_status text not null default 'pending',

  verified_by uuid,
  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_banker_profiles_status_idx
on public.finance_banker_profiles (final_status, created_at desc);

create index if not exists finance_banker_profiles_bank_idx
on public.finance_banker_profiles (bank_name, ifsc_code);

alter table public.finance_banker_profiles enable row level security;

drop policy if exists "Anyone can apply as banker"
on public.finance_banker_profiles;

create policy "Anyone can apply as banker"
on public.finance_banker_profiles
for insert
with check (true);