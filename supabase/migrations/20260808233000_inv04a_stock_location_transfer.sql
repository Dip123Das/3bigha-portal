begin;

-- ============================================================
-- INV-04A — Stock Location & Transfer Control
--
-- Canonical material current_stock remains the authoritative total.
-- Location balances are subordinate allocations that answer WHERE
-- the stock is physically held. They must never exceed or replace
-- the canonical material balance.
-- ============================================================

create table if not exists public.bos_inventory_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  location_code text not null,
  location_name text not null,

  godown_no text,
  room_no text,
  rack_no text,

  notes text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, location_code)
);

create table if not exists public.bos_material_location_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  material_listing_id uuid not null
    references public.material_listings(id) on delete cascade,

  location_id uuid not null
    references public.bos_inventory_locations(id) on delete cascade,

  quantity numeric(18,4) not null default 0 check (quantity >= 0),
  unit text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(material_listing_id, location_id)
);

create table if not exists public.bos_inventory_location_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  material_listing_id uuid not null
    references public.material_listings(id) on delete cascade,

  from_location_id uuid not null
    references public.bos_inventory_locations(id),

  to_location_id uuid not null
    references public.bos_inventory_locations(id),

  quantity numeric(18,4) not null check (quantity > 0),
  unit text,

  note text,
  status text not null default 'posted'
    check (status in ('posted','cancelled')),

  transfer_out_transaction_id uuid
    references public.bos_inventory_transactions(id) on delete set null,

  transfer_in_transaction_id uuid
    references public.bos_inventory_transactions(id) on delete set null,

  created_at timestamptz not null default now(),

  check (from_location_id <> to_location_id)
);

create index if not exists bos_inventory_locations_user_idx
  on public.bos_inventory_locations(user_id, is_active, location_name);

create index if not exists bos_material_location_allocations_material_idx
  on public.bos_material_location_allocations(material_listing_id);

create index if not exists bos_inventory_location_transfers_user_idx
  on public.bos_inventory_location_transfers(user_id, created_at desc);

alter table public.bos_inventory_locations enable row level security;
alter table public.bos_material_location_allocations enable row level security;
alter table public.bos_inventory_location_transfers enable row level security;

grant select, insert, update
on public.bos_inventory_locations
to authenticated;

grant select
on public.bos_material_location_allocations
to authenticated;

grant select
on public.bos_inventory_location_transfers
to authenticated;

drop policy if exists "Members manage own inventory locations"
  on public.bos_inventory_locations;

create policy "Members manage own inventory locations"
on public.bos_inventory_locations
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Members read own material location allocations"
  on public.bos_material_location_allocations;

create policy "Members read own material location allocations"
on public.bos_material_location_allocations
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.material_listings ml
    where ml.id = bos_material_location_allocations.material_listing_id
      and ml.vendor_user_id = auth.uid()
  )
);

drop policy if exists "Members read own inventory location transfers"
  on public.bos_inventory_location_transfers;

create policy "Members read own inventory location transfers"
on public.bos_inventory_location_transfers
for select
to authenticated
using (user_id = auth.uid());

-- ------------------------------------------------------------
-- Seed/assign an existing material to a physical location.
-- This does NOT change current_stock. It allocates part/all of the
-- canonical total to a subordinate physical location.
-- ------------------------------------------------------------

create or replace function public.assign_bos_material_stock_location(
  target_material_listing_id uuid,
  target_location_id uuid,
  target_quantity numeric
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  listing_user uuid;
  listing_attributes jsonb;
  inventory_json jsonb;
  canonical_stock numeric;
  stock_unit text;
  location_user uuid;
  already_allocated numeric;
  max_assignable numeric;
begin
  if target_quantity is null or target_quantity < 0 then
    raise exception 'Location quantity must be zero or greater';
  end if;

  select vendor_user_id, attributes
  into listing_user, listing_attributes
  from public.material_listings
  where id = target_material_listing_id
  for update;

  if listing_user is null or listing_user <> auth.uid() then
    raise exception 'Material inventory item not found or access denied';
  end if;

  select user_id
  into location_user
  from public.bos_inventory_locations
  where id = target_location_id
    and is_active = true;

  if location_user is null or location_user <> auth.uid() then
    raise exception 'Inventory location not found or access denied';
  end if;

  inventory_json :=
    coalesce(listing_attributes->'inventory','{}'::jsonb);

  canonical_stock :=
    coalesce(
      nullif(inventory_json->>'current_stock','')::numeric,
      0
    );

  stock_unit :=
    nullif(trim(coalesce(inventory_json->>'stock_unit','')), '');

  select coalesce(sum(quantity),0)
  into already_allocated
  from public.bos_material_location_allocations
  where material_listing_id = target_material_listing_id
    and location_id <> target_location_id;

  max_assignable := canonical_stock - already_allocated;

  if target_quantity > max_assignable then
    raise exception
      'Location allocation exceeds canonical stock. Available to allocate: %',
      max_assignable;
  end if;

  insert into public.bos_material_location_allocations (
    user_id,
    material_listing_id,
    location_id,
    quantity,
    unit
  )
  values (
    auth.uid(),
    target_material_listing_id,
    target_location_id,
    target_quantity,
    stock_unit
  )
  on conflict (material_listing_id, location_id)
  do update set
    quantity = excluded.quantity,
    unit = excluded.unit,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'material_listing_id', target_material_listing_id,
    'location_id', target_location_id,
    'allocated_quantity', target_quantity,
    'canonical_stock', canonical_stock,
    'unallocated_quantity', canonical_stock - already_allocated - target_quantity,
    'unit', stock_unit
  );
end;
$$;

revoke all
on function public.assign_bos_material_stock_location(uuid,uuid,numeric)
from public, anon;

grant execute
on function public.assign_bos_material_stock_location(uuid,uuid,numeric)
to authenticated;

-- ------------------------------------------------------------
-- Atomic internal location transfer.
--
-- It validates source allocation, moves subordinate location
-- quantities, and records paired canonical semantic transactions.
-- The pair is in one DB transaction, so canonical total stock ends
-- exactly where it started.
-- ------------------------------------------------------------

create or replace function public.transfer_bos_material_between_locations(
  target_material_listing_id uuid,
  target_from_location_id uuid,
  target_to_location_id uuid,
  target_quantity numeric,
  target_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  listing_user uuid;
  listing_attributes jsonb;
  inventory_json jsonb;
  canonical_before numeric;
  canonical_after numeric;
  stock_unit text;

  from_user uuid;
  to_user uuid;
  from_qty numeric;
  to_qty numeric;

  transfer_row public.bos_inventory_location_transfers%rowtype;
  out_result jsonb;
  in_result jsonb;
  out_transaction_id uuid;
  in_transaction_id uuid;
begin
  if target_from_location_id = target_to_location_id then
    raise exception 'Source and destination locations must be different';
  end if;

  if target_quantity is null or target_quantity <= 0 then
    raise exception 'Transfer quantity must be greater than zero';
  end if;

  select vendor_user_id, attributes
  into listing_user, listing_attributes
  from public.material_listings
  where id = target_material_listing_id
  for update;

  if listing_user is null or listing_user <> auth.uid() then
    raise exception 'Material inventory item not found or access denied';
  end if;

  select user_id into from_user
  from public.bos_inventory_locations
  where id = target_from_location_id and is_active = true;

  select user_id into to_user
  from public.bos_inventory_locations
  where id = target_to_location_id and is_active = true;

  if from_user is null or from_user <> auth.uid()
     or to_user is null or to_user <> auth.uid() then
    raise exception 'Source or destination location not found or access denied';
  end if;

  select quantity
  into from_qty
  from public.bos_material_location_allocations
  where material_listing_id = target_material_listing_id
    and location_id = target_from_location_id
  for update;

  from_qty := coalesce(from_qty, 0);

  if from_qty < target_quantity then
    raise exception
      'Insufficient stock at source location. Available: %, requested: %',
      from_qty,
      target_quantity;
  end if;

  select quantity
  into to_qty
  from public.bos_material_location_allocations
  where material_listing_id = target_material_listing_id
    and location_id = target_to_location_id
  for update;

  to_qty := coalesce(to_qty, 0);

  inventory_json :=
    coalesce(listing_attributes->'inventory','{}'::jsonb);

  canonical_before :=
    coalesce(
      nullif(inventory_json->>'current_stock','')::numeric,
      0
    );

  stock_unit :=
    nullif(trim(coalesce(inventory_json->>'stock_unit','')), '');

  insert into public.bos_inventory_location_transfers (
    user_id,
    material_listing_id,
    from_location_id,
    to_location_id,
    quantity,
    unit,
    note
  )
  values (
    auth.uid(),
    target_material_listing_id,
    target_from_location_id,
    target_to_location_id,
    target_quantity,
    stock_unit,
    nullif(trim(coalesce(target_note,'')), '')
  )
  returning * into transfer_row;

  out_result :=
    public.post_bos_material_inventory_transaction(
      target_material_listing_id,
      'transfer_out',
      target_quantity,
      stock_unit,
      null,
      'inventory_location_transfer',
      'location_transfer',
      transfer_row.id::text,
      'location-transfer-out:' || transfer_row.id::text,
      coalesce(target_note, 'Internal stock location transfer out'),
      jsonb_build_object(
        'transfer_id', transfer_row.id,
        'from_location_id', target_from_location_id,
        'to_location_id', target_to_location_id,
        'internal_transfer', true
      )
    );

  in_result :=
    public.post_bos_material_inventory_transaction(
      target_material_listing_id,
      'transfer_in',
      target_quantity,
      stock_unit,
      null,
      'inventory_location_transfer',
      'location_transfer',
      transfer_row.id::text,
      'location-transfer-in:' || transfer_row.id::text,
      coalesce(target_note, 'Internal stock location transfer in'),
      jsonb_build_object(
        'transfer_id', transfer_row.id,
        'from_location_id', target_from_location_id,
        'to_location_id', target_to_location_id,
        'internal_transfer', true
      )
    );

  out_transaction_id :=
    nullif(out_result->>'transaction_id','')::uuid;

  in_transaction_id :=
    nullif(in_result->>'transaction_id','')::uuid;

  update public.bos_material_location_allocations
  set
    quantity = quantity - target_quantity,
    updated_at = now()
  where material_listing_id = target_material_listing_id
    and location_id = target_from_location_id;

  insert into public.bos_material_location_allocations (
    user_id,
    material_listing_id,
    location_id,
    quantity,
    unit
  )
  values (
    auth.uid(),
    target_material_listing_id,
    target_to_location_id,
    target_quantity,
    stock_unit
  )
  on conflict (material_listing_id, location_id)
  do update set
    quantity = bos_material_location_allocations.quantity + excluded.quantity,
    unit = excluded.unit,
    updated_at = now();

  update public.bos_inventory_location_transfers
  set
    transfer_out_transaction_id = out_transaction_id,
    transfer_in_transaction_id = in_transaction_id
  where id = transfer_row.id;

  select
    coalesce(
      nullif(attributes->'inventory'->>'current_stock','')::numeric,
      0
    )
  into canonical_after
  from public.material_listings
  where id = target_material_listing_id;

  if canonical_after <> canonical_before then
    raise exception
      'Internal transfer changed canonical total unexpectedly';
  end if;

  return jsonb_build_object(
    'ok', true,
    'transfer_id', transfer_row.id,
    'material_listing_id', target_material_listing_id,
    'quantity', target_quantity,
    'unit', stock_unit,
    'from_location_id', target_from_location_id,
    'to_location_id', target_to_location_id,
    'source_location_after', from_qty - target_quantity,
    'destination_location_after', to_qty + target_quantity,
    'canonical_stock_before', canonical_before,
    'canonical_stock_after', canonical_after,
    'transfer_out_transaction_id', out_transaction_id,
    'transfer_in_transaction_id', in_transaction_id
  );
end;
$$;

revoke all
on function public.transfer_bos_material_between_locations(
  uuid,uuid,uuid,numeric,text
)
from public, anon;

grant execute
on function public.transfer_bos_material_between_locations(
  uuid,uuid,uuid,numeric,text
)
to authenticated;

commit;
