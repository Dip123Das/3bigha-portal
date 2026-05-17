create table if not exists public.inventory_stock_movements (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null references auth.users(id) on delete cascade,
  material_listing_id uuid references public.material_listings(id) on delete cascade,
  movement_type text not null check (
    movement_type in (
      'opening',
      'purchase',
      'sale',
      'return_in',
      'return_out',
      'damage',
      'manual_adjustment',
      'online_order',
      'offline_bill'
    )
  ),
  quantity numeric not null default 0,
  unit text,
  unit_price numeric,
  total_value numeric,
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_stock_movements_vendor
on public.inventory_stock_movements(vendor_user_id);

create index if not exists idx_inventory_stock_movements_material
on public.inventory_stock_movements(material_listing_id);

create table if not exists public.vendor_vehicles (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_type text not null default 'truck',
  vehicle_number text not null,
  driver_name text,
  driver_phone text,
  load_capacity text,
  capacity_value numeric,
  capacity_unit text,
  current_status text not null default 'available' check (
    current_status in ('available', 'assigned', 'in_transit', 'maintenance', 'inactive')
  ),
  gps_tracking_url text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vendor_user_id, vehicle_number)
);

create index if not exists idx_vendor_vehicles_vendor
on public.vendor_vehicles(vendor_user_id);

create table if not exists public.inventory_dispatches (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null references auth.users(id) on delete cascade,
  material_listing_id uuid references public.material_listings(id) on delete set null,
  vehicle_id uuid references public.vendor_vehicles(id) on delete set null,
  buyer_user_id uuid references auth.users(id) on delete set null,
  order_reference text,
  buyer_name text,
  buyer_phone text,
  delivery_address text,
  material_name text,
  quantity numeric,
  unit text,
  dispatch_status text not null default 'pending' check (
    dispatch_status in (
      'pending',
      'assigned',
      'loaded',
      'in_transit',
      'delivered',
      'cancelled',
      'failed'
    )
  ),
  expected_delivery_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  tracking_url text,
  proof_image_url text,
  driver_note text,
  buyer_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_dispatches_vendor
on public.inventory_dispatches(vendor_user_id);

create index if not exists idx_inventory_dispatches_vehicle
on public.inventory_dispatches(vehicle_id);

create index if not exists idx_inventory_dispatches_status
on public.inventory_dispatches(dispatch_status);

create table if not exists public.inventory_bills (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null references auth.users(id) on delete cascade,
  bill_no text not null,
  bill_type text not null default 'offline' check (
    bill_type in ('offline', 'online', 'quotation', 'delivery_challan', 'gst_invoice')
  ),
  customer_name text,
  customer_phone text,
  customer_address text,
  subtotal numeric not null default 0,
  discount_amount numeric not null default 0,
  tax_amount numeric not null default 0,
  total_amount numeric not null default 0,
  payment_status text not null default 'unpaid' check (
    payment_status in ('unpaid', 'partial', 'paid', 'cancelled')
  ),
  payment_mode text,
  bill_items jsonb not null default '[]'::jsonb,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vendor_user_id, bill_no)
);

create index if not exists idx_inventory_bills_vendor
on public.inventory_bills(vendor_user_id);

create index if not exists idx_inventory_bills_bill_no
on public.inventory_bills(bill_no);

alter table public.inventory_stock_movements enable row level security;
alter table public.vendor_vehicles enable row level security;
alter table public.inventory_dispatches enable row level security;
alter table public.inventory_bills enable row level security;

create policy "Vendors can manage own stock movements"
on public.inventory_stock_movements
for all
using (auth.uid() = vendor_user_id)
with check (auth.uid() = vendor_user_id);

create policy "Vendors can manage own vehicles"
on public.vendor_vehicles
for all
using (auth.uid() = vendor_user_id)
with check (auth.uid() = vendor_user_id);

create policy "Vendors can manage own dispatches"
on public.inventory_dispatches
for all
using (auth.uid() = vendor_user_id)
with check (auth.uid() = vendor_user_id);

create policy "Vendors can manage own bills"
on public.inventory_bills
for all
using (auth.uid() = vendor_user_id)
with check (auth.uid() = vendor_user_id);