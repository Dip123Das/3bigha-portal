create table if not exists public.rental_assets (
  id uuid primary key default gen_random_uuid(),

  vendor_user_id uuid not null,

  rental_listing_id uuid,

  asset_code text,
  asset_name text not null,

  asset_type text not null default 'machinery',

  registration_no text,
  serial_no text,

  quantity numeric(12,2) not null default 1,

  availability_status text not null default 'available',

  hourly_rate numeric(12,2) not null default 0,
  daily_rate numeric(12,2) not null default 0,
  weekly_rate numeric(12,2) not null default 0,
  monthly_rate numeric(12,2) not null default 0,

  operator_available boolean not null default false,

  fuel_policy text,
  transport_policy text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rental_assets_vendor
on public.rental_assets(vendor_user_id);

alter table public.rental_assets enable row level security;

drop policy if exists "rental_assets_select_own" on public.rental_assets;

drop policy if exists "rental_assets_select_own" on public.rental_assets;

create policy "rental_assets_select_own"
on public.rental_assets
for select
using (auth.uid() = vendor_user_id);

drop policy if exists "rental_assets_insert_own" on public.rental_assets;

drop policy if exists "rental_assets_insert_own" on public.rental_assets;

create policy "rental_assets_insert_own"
on public.rental_assets
for insert
with check (auth.uid() = vendor_user_id);

drop policy if exists "rental_assets_update_own" on public.rental_assets;

drop policy if exists "rental_assets_update_own" on public.rental_assets;

create policy "rental_assets_update_own"
on public.rental_assets
for update
using (auth.uid() = vendor_user_id);

drop policy if exists "rental_assets_delete_own" on public.rental_assets;

drop policy if exists "rental_assets_delete_own" on public.rental_assets;

create policy "rental_assets_delete_own"
on public.rental_assets
for delete
using (auth.uid() = vendor_user_id);
