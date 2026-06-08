create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null,
  event_type text not null,
  module text not null,
  title text not null,
  description text,
  reference_type text,
  reference_id uuid,
  event_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_operational_events_vendor
on public.operational_events(vendor_user_id, created_at desc);

alter table public.operational_events enable row level security;

drop policy if exists "operational_events_select_own" on public.operational_events;
create policy "operational_events_select_own"
on public.operational_events for select
using (auth.uid() = vendor_user_id);

drop policy if exists "operational_events_insert_own" on public.operational_events;
create policy "operational_events_insert_own"
on public.operational_events for insert
with check (auth.uid() = vendor_user_id);


create table if not exists public.customer_ledgers (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null,
  customer_name text not null,
  customer_phone text,
  customer_address text,
  reference_type text,
  reference_id uuid,
  entry_type text not null default 'invoice',
  debit_amount numeric(12,2) not null default 0,
  credit_amount numeric(12,2) not null default 0,
  balance_amount numeric(12,2) not null default 0,
  payment_status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_ledgers_vendor
on public.customer_ledgers(vendor_user_id, created_at desc);

alter table public.customer_ledgers enable row level security;

drop policy if exists "customer_ledgers_manage_own" on public.customer_ledgers;
create policy "customer_ledgers_manage_own"
on public.customer_ledgers for all
using (auth.uid() = vendor_user_id)
with check (auth.uid() = vendor_user_id);


create table if not exists public.rental_bookings (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null,
  rental_asset_id uuid,
  rental_listing_id uuid,
  customer_name text not null,
  customer_phone text,
  site_address text,
  booking_start timestamptz,
  booking_end timestamptz,
  rental_rate numeric(12,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  operator_required boolean not null default false,
  transport_required boolean not null default false,
  fuel_policy text,
  booking_status text not null default 'booked',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rental_bookings_vendor
on public.rental_bookings(vendor_user_id, created_at desc);

alter table public.rental_bookings enable row level security;

drop policy if exists "rental_bookings_manage_own" on public.rental_bookings;
create policy "rental_bookings_manage_own"
on public.rental_bookings for all
using (auth.uid() = vendor_user_id)
with check (auth.uid() = vendor_user_id);


create table if not exists public.service_work_orders (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null,
  service_listing_id uuid,
  customer_name text not null,
  customer_phone text,
  site_address text,
  service_title text not null,
  estimated_amount numeric(12,2) not null default 0,
  advance_amount numeric(12,2) not null default 0,
  assigned_team text,
  work_status text not null default 'draft',
  expected_start timestamptz,
  expected_completion timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_work_orders_vendor
on public.service_work_orders(vendor_user_id, created_at desc);

alter table public.service_work_orders enable row level security;

drop policy if exists "service_work_orders_manage_own" on public.service_work_orders;
create policy "service_work_orders_manage_own"
on public.service_work_orders for all
using (auth.uid() = vendor_user_id)
with check (auth.uid() = vendor_user_id);
