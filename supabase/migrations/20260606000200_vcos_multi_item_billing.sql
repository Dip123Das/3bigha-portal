create table if not exists public.inventory_bill_items (
  id uuid primary key default gen_random_uuid(),

  bill_id uuid not null references public.inventory_bills(id) on delete cascade,

  vendor_user_id uuid not null,

  item_type text not null default 'inventory',

  inventory_entity_id uuid,

  item_name text not null,
  item_description text,

  quantity numeric(12,2) not null default 1,
  unit text,

  rate numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,

  line_total numeric(12,2) not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_bill_items_bill
on public.inventory_bill_items(bill_id);

create index if not exists idx_inventory_bill_items_vendor
on public.inventory_bill_items(vendor_user_id);

alter table public.inventory_bill_items enable row level security;

drop policy if exists "inventory_bill_items_select_own" on public.inventory_bill_items;

create policy "inventory_bill_items_select_own"
on public.inventory_bill_items
for select
using (auth.uid() = vendor_user_id);

drop policy if exists "inventory_bill_items_insert_own" on public.inventory_bill_items;

create policy "inventory_bill_items_insert_own"
on public.inventory_bill_items
for insert
with check (auth.uid() = vendor_user_id);

drop policy if exists "inventory_bill_items_update_own" on public.inventory_bill_items;

create policy "inventory_bill_items_update_own"
on public.inventory_bill_items
for update
using (auth.uid() = vendor_user_id);

drop policy if exists "inventory_bill_items_delete_own" on public.inventory_bill_items;

create policy "inventory_bill_items_delete_own"
on public.inventory_bill_items
for delete
using (auth.uid() = vendor_user_id);
