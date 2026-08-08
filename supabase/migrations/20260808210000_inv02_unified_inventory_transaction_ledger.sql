begin;

-- ============================================================
-- INV-02A — Unified Inventory Transaction Ledger Foundation
--
-- Principle:
--   material_listings.attributes.inventory.current_stock remains the
--   current material stock balance for backward compatibility.
--   bos_inventory_transactions becomes the semantic audit authority.
--
-- This is NOT a second inventory. It records why/how the existing
-- inventory balance changed and provides one atomic posting API.
-- ============================================================

create table if not exists public.bos_inventory_transaction_types (
  transaction_type text primary key,
  label text not null,
  direction text not null
    check (direction in ('in','out','neutral')),
  affects_quantity boolean not null default true,
  is_system boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.bos_inventory_transaction_types
  (transaction_type,label,direction,affects_quantity,sort_order,description)
values
  ('opening_stock','Opening Stock','in',true,10,'Initial stock brought into inventory'),
  ('purchase_receipt','Purchase Receipt','in',true,20,'Stock received from procurement/purchase'),
  ('production_receipt','Production Receipt','in',true,30,'Finished production moved into sellable inventory'),
  ('customer_return','Customer Return','in',true,40,'Previously sold stock returned by customer'),
  ('material_return','Material Return','in',true,50,'Unused material returned from production/project'),
  ('sale','Sale','out',true,60,'Stock sold through billing/order'),
  ('dispatch','Dispatch','out',true,70,'Stock released to dispatch where dispatch is the stock event'),
  ('material_issue','Material Issue','out',true,80,'Owned stock issued to production/project costing'),
  ('damage','Damage','out',true,90,'Damaged inventory written down'),
  ('loss','Loss','out',true,100,'Lost/missing inventory written down'),
  ('transfer_out','Transfer Out','out',true,110,'Stock transferred out of this inventory location'),
  ('transfer_in','Transfer In','in',true,120,'Stock transferred into this inventory location'),
  ('stock_adjustment_in','Stock Adjustment +','in',true,130,'Human-approved positive reconciliation'),
  ('stock_adjustment_out','Stock Adjustment -','out',true,140,'Human-approved negative reconciliation'),
  ('reservation','Reservation','neutral',false,150,'Quantity reservation without changing physical stock'),
  ('release_reservation','Release Reservation','neutral',false,160,'Reservation release without changing physical stock')
on conflict (transaction_type) do update set
  label = excluded.label,
  direction = excluded.direction,
  affects_quantity = excluded.affects_quantity,
  sort_order = excluded.sort_order,
  description = excluded.description,
  updated_at = now();

create table if not exists public.bos_inventory_transactions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  inventory_domain text not null
    check (inventory_domain in ('materials','rentals','property')),

  inventory_entity_type text not null,
  inventory_entity_id uuid not null,

  transaction_type text not null
    references public.bos_inventory_transaction_types(transaction_type),

  quantity numeric(18,4) not null default 0,
  unit text,

  stock_before numeric(18,4),
  stock_after numeric(18,4),

  unit_cost numeric(18,4),
  total_cost numeric(18,2),

  source_module text,
  source_reference_type text,
  source_reference_id text,

  idempotency_key text,
  note text,
  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  unique(user_id,idempotency_key)
);

comment on table public.bos_inventory_transactions is
  'Semantic 3BOS inventory transaction ledger. Existing domain tables remain the inventory source of truth; this table records atomic inventory movements across operational modules.';

create index if not exists bos_inventory_transactions_entity_idx
  on public.bos_inventory_transactions
    (inventory_domain,inventory_entity_type,inventory_entity_id,occurred_at desc);

create index if not exists bos_inventory_transactions_user_idx
  on public.bos_inventory_transactions(user_id,occurred_at desc);

create index if not exists bos_inventory_transactions_source_idx
  on public.bos_inventory_transactions(source_module,source_reference_type,source_reference_id);

alter table public.bos_inventory_transactions enable row level security;

grant select on public.bos_inventory_transaction_types to authenticated;
grant select on public.bos_inventory_transactions to authenticated;

drop policy if exists "Members read own inventory transactions"
  on public.bos_inventory_transactions;

create policy "Members read own inventory transactions"
on public.bos_inventory_transactions
for select
to authenticated
using (user_id = auth.uid());

-- ------------------------------------------------------------
-- Canonical material inventory posting RPC
--
-- The RPC is intentionally the only write grant for this first
-- foundation. It keeps material_listings current_stock compatible
-- while recording a semantic transaction in one DB transaction.
-- ------------------------------------------------------------

create or replace function public.post_bos_material_inventory_transaction(
  target_material_listing_id uuid,
  target_transaction_type text,
  target_quantity numeric,
  target_unit text default null,
  target_unit_cost numeric default null,
  target_source_module text default null,
  target_source_reference_type text default null,
  target_source_reference_id text default null,
  target_idempotency_key text default null,
  target_note text default null,
  target_metadata jsonb default '{}'::jsonb
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
  current_stock numeric;
  next_stock numeric;
  stock_unit text;

  movement_direction text;
  affects_quantity boolean;
  signed_quantity numeric;

  existing_transaction public.bos_inventory_transactions%rowtype;
  created_transaction public.bos_inventory_transactions%rowtype;
begin
  if target_quantity is null or target_quantity < 0 then
    raise exception 'Transaction quantity must be zero or greater';
  end if;

  select direction, t.affects_quantity
  into movement_direction, affects_quantity
  from public.bos_inventory_transaction_types t
  where t.transaction_type = target_transaction_type
    and t.is_active = true;

  if movement_direction is null then
    raise exception 'Unknown or inactive inventory transaction type: %',
      target_transaction_type;
  end if;

  if target_idempotency_key is not null then
    select *
    into existing_transaction
    from public.bos_inventory_transactions
    where user_id = auth.uid()
      and idempotency_key = target_idempotency_key;

    if existing_transaction.id is not null then
      return jsonb_build_object(
        'ok', true,
        'already_posted', true,
        'transaction_id', existing_transaction.id,
        'stock_before', existing_transaction.stock_before,
        'stock_after', existing_transaction.stock_after
      );
    end if;
  end if;

  select vendor_user_id, attributes
  into listing_user, listing_attributes
  from public.material_listings
  where id = target_material_listing_id
  for update;

  if listing_user is null then
    raise exception 'Material inventory item not found';
  end if;

  if listing_user <> auth.uid() then
    raise exception 'Material inventory item does not belong to you';
  end if;

  inventory_json :=
    coalesce(listing_attributes->'inventory','{}'::jsonb);

  current_stock :=
    coalesce(
      nullif(inventory_json->>'current_stock','')::numeric,
      0
    );

  stock_unit :=
    nullif(trim(coalesce(inventory_json->>'stock_unit','')), '');

  if (
    stock_unit is not null
    and target_unit is not null
    and trim(target_unit) <> ''
    and lower(trim(stock_unit)) <> lower(trim(target_unit))
  ) then
    raise exception
      'Unit mismatch. Inventory uses %, transaction uses %',
      stock_unit,
      target_unit;
  end if;

  signed_quantity :=
    case
      when affects_quantity is false then 0
      when movement_direction = 'in' then target_quantity
      when movement_direction = 'out' then -target_quantity
      else 0
    end;

  next_stock := current_stock + signed_quantity;

  if next_stock < 0 then
    raise exception
      'Insufficient stock. Available: %, requested movement: %',
      current_stock,
      target_quantity;
  end if;

  if affects_quantity then
    update public.material_listings
    set attributes =
      jsonb_set(
        coalesce(listing_attributes,'{}'::jsonb),
        '{inventory,current_stock}',
        to_jsonb(next_stock),
        true
      )
    where id = target_material_listing_id
      and vendor_user_id = auth.uid();
  end if;

  insert into public.bos_inventory_transactions (
    user_id,
    inventory_domain,
    inventory_entity_type,
    inventory_entity_id,
    transaction_type,
    quantity,
    unit,
    stock_before,
    stock_after,
    unit_cost,
    total_cost,
    source_module,
    source_reference_type,
    source_reference_id,
    idempotency_key,
    note,
    metadata
  )
  values (
    auth.uid(),
    'materials',
    'material_listing',
    target_material_listing_id,
    target_transaction_type,
    signed_quantity,
    coalesce(nullif(trim(target_unit),''),stock_unit),
    current_stock,
    next_stock,
    target_unit_cost,
    case
      when target_unit_cost is null then null
      else round(target_quantity * target_unit_cost,2)
    end,
    target_source_module,
    target_source_reference_type,
    target_source_reference_id,
    target_idempotency_key,
    target_note,
    coalesce(target_metadata,'{}'::jsonb)
  )
  returning * into created_transaction;

  return jsonb_build_object(
    'ok', true,
    'already_posted', false,
    'transaction_id', created_transaction.id,
    'transaction_type', created_transaction.transaction_type,
    'quantity', created_transaction.quantity,
    'stock_before', created_transaction.stock_before,
    'stock_after', created_transaction.stock_after
  );
end;
$$;

revoke all
on function public.post_bos_material_inventory_transaction(
  uuid,text,numeric,text,numeric,text,text,text,text,text,jsonb
)
from public, anon;

grant execute
on function public.post_bos_material_inventory_transaction(
  uuid,text,numeric,text,numeric,text,text,text,text,text,jsonb
)
to authenticated;

commit;
