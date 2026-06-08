create table if not exists public.inventory_entities (
  id uuid primary key default gen_random_uuid(),

  vendor_user_id uuid not null,

  entity_type text not null default 'material',

  name text not null,
  description text,

  sku text,

  unit text,

  current_quantity numeric(12,2) not null default 0,
  reserved_quantity numeric(12,2) not null default 0,
  available_quantity numeric(12,2) not null default 0,

  status text not null default 'active',

  pricing_metadata jsonb not null default '{}'::jsonb,
  location_metadata jsonb not null default '{}'::jsonb,
  seo_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_entities_vendor
on public.inventory_entities(vendor_user_id);

create index if not exists idx_inventory_entities_type
on public.inventory_entities(entity_type);

alter table public.inventory_entities enable row level security;

create policy "inventory_entities_select_own"
on public.inventory_entities
for select
using (auth.uid() = vendor_user_id);

create policy "inventory_entities_insert_own"
on public.inventory_entities
for insert
with check (auth.uid() = vendor_user_id);

create policy "inventory_entities_update_own"
on public.inventory_entities
for update
using (auth.uid() = vendor_user_id);

create policy "inventory_entities_delete_own"
on public.inventory_entities
for delete
using (auth.uid() = vendor_user_id);
