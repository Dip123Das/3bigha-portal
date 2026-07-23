alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists account_status_reason text,
  add column if not exists account_status_changed_at timestamptz,
  add column if not exists account_status_changed_by uuid references auth.users(id) on delete set null,
  add column if not exists geo_state_id uuid references public.geo_states(id) on delete set null,
  add column if not exists geo_district_id uuid references public.geo_districts(id) on delete set null,
  add column if not exists geo_subdivision_id uuid references public.geo_subdivisions(id) on delete set null,
  add column if not exists geo_block_id uuid references public.geo_blocks(id) on delete set null,
  add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (
    account_status in (
      'active',
      'deactivated',
      're_registration_required',
      'permanently_blocked'
    )
  );
create index if not exists profiles_account_status_idx on public.profiles(account_status);
create index if not exists profiles_geo_admin_idx on public.profiles(geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id);

create table if not exists public.admin_account_action_audit (
  id bigint generated always as identity primary key,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('activate','deactivate')),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_cash_subscription_audit (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  subscription_plan text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'INR',
  receipt_reference text not null,
  notes text,
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_account_action_audit enable row level security;
alter table public.admin_cash_subscription_audit enable row level security;
revoke all on public.admin_account_action_audit, public.admin_cash_subscription_audit from anon, authenticated;
