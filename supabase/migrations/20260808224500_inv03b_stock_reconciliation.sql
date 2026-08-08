begin;

-- ============================================================
-- INV-03B — Physical Stock Count & Reconciliation Audit
--
-- This does NOT create another stock balance.
-- material_listings.attributes.inventory.current_stock remains the
-- operational balance and post_bos_material_inventory_transaction()
-- remains the only authority that changes it.
--
-- This table records physical-count evidence and reconciliation status.
-- ============================================================

create table if not exists public.bos_inventory_stock_counts (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  material_listing_id uuid not null references public.material_listings(id) on delete cascade,

  system_stock numeric(18,4) not null,
  physical_stock numeric(18,4) not null check (physical_stock >= 0),
  variance numeric(18,4) not null,

  unit text,
  status text not null default 'counted'
    check (status in ('counted','matched','reconciled','cancelled')),

  count_note text,
  counted_at timestamptz not null default now(),

  reconciliation_transaction_id uuid
    references public.bos_inventory_transactions(id) on delete set null,

  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.bos_inventory_stock_counts is
  'Physical-count audit evidence for material inventory. It never stores the authoritative stock balance; reconciliation posts only through the canonical inventory transaction RPC.';

create index if not exists bos_inventory_stock_counts_user_idx
  on public.bos_inventory_stock_counts(user_id, counted_at desc);

create index if not exists bos_inventory_stock_counts_material_idx
  on public.bos_inventory_stock_counts(material_listing_id, counted_at desc);

alter table public.bos_inventory_stock_counts enable row level security;

grant select, insert, update
on public.bos_inventory_stock_counts
to authenticated;

drop policy if exists "Members manage own material stock counts"
  on public.bos_inventory_stock_counts;

create policy "Members manage own material stock counts"
on public.bos_inventory_stock_counts
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.material_listings ml
    where ml.id = bos_inventory_stock_counts.material_listing_id
      and ml.vendor_user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.material_listings ml
    where ml.id = bos_inventory_stock_counts.material_listing_id
      and ml.vendor_user_id = auth.uid()
  )
);

create or replace function public.create_bos_material_stock_count(
  target_material_listing_id uuid,
  target_physical_stock numeric,
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
  current_stock numeric;
  stock_unit text;
  count_row public.bos_inventory_stock_counts%rowtype;
begin
  if target_physical_stock is null or target_physical_stock < 0 then
    raise exception 'Physical stock must be zero or greater';
  end if;

  select vendor_user_id, attributes
  into listing_user, listing_attributes
  from public.material_listings
  where id = target_material_listing_id;

  if listing_user is null then
    raise exception 'Material inventory item not found';
  end if;

  if listing_user <> auth.uid() then
    raise exception 'Material inventory item does not belong to you';
  end if;

  inventory_json :=
    coalesce(listing_attributes->'inventory', '{}'::jsonb);

  current_stock :=
    coalesce(
      nullif(inventory_json->>'current_stock','')::numeric,
      0
    );

  stock_unit :=
    nullif(trim(coalesce(inventory_json->>'stock_unit','')), '');

  insert into public.bos_inventory_stock_counts (
    user_id,
    material_listing_id,
    system_stock,
    physical_stock,
    variance,
    unit,
    status,
    count_note
  )
  values (
    auth.uid(),
    target_material_listing_id,
    current_stock,
    target_physical_stock,
    target_physical_stock - current_stock,
    stock_unit,
    case
      when target_physical_stock = current_stock then 'matched'
      else 'counted'
    end,
    nullif(trim(coalesce(target_note,'')), '')
  )
  returning * into count_row;

  return jsonb_build_object(
    'ok', true,
    'count_id', count_row.id,
    'system_stock', count_row.system_stock,
    'physical_stock', count_row.physical_stock,
    'variance', count_row.variance,
    'unit', count_row.unit,
    'status', count_row.status
  );
end;
$$;

revoke all
on function public.create_bos_material_stock_count(uuid,numeric,text)
from public, anon;

grant execute
on function public.create_bos_material_stock_count(uuid,numeric,text)
to authenticated;

create or replace function public.reconcile_bos_material_stock_count(
  target_count_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  count_row public.bos_inventory_stock_counts%rowtype;
  current_owner uuid;
  current_attributes jsonb;
  current_inventory jsonb;
  current_stock numeric;
  variance_now numeric;
  transaction_type text;
  transaction_result jsonb;
  transaction_id uuid;
begin
  select *
  into count_row
  from public.bos_inventory_stock_counts
  where id = target_count_id
  for update;

  if count_row.id is null then
    raise exception 'Stock count not found';
  end if;

  if count_row.user_id <> auth.uid() then
    raise exception 'Access denied';
  end if;

  if count_row.status = 'reconciled' then
    return jsonb_build_object(
      'ok', true,
      'already_reconciled', true,
      'count_id', count_row.id,
      'transaction_id', count_row.reconciliation_transaction_id
    );
  end if;

  if count_row.status = 'cancelled' then
    raise exception 'Stock count is cancelled';
  end if;

  select vendor_user_id, attributes
  into current_owner, current_attributes
  from public.material_listings
  where id = count_row.material_listing_id
  for update;

  if current_owner is null or current_owner <> auth.uid() then
    raise exception 'Material inventory item not found or access denied';
  end if;

  current_inventory :=
    coalesce(current_attributes->'inventory','{}'::jsonb);

  current_stock :=
    coalesce(
      nullif(current_inventory->>'current_stock','')::numeric,
      0
    );

  -- Recalculate against the current canonical balance so stale counts
  -- cannot blindly overwrite intervening sales/receipts/issues.
  variance_now := count_row.physical_stock - current_stock;

  if variance_now = 0 then
    update public.bos_inventory_stock_counts
    set
      system_stock = current_stock,
      variance = 0,
      status = 'matched',
      reconciled_at = now(),
      updated_at = now()
    where id = count_row.id;

    return jsonb_build_object(
      'ok', true,
      'already_reconciled', false,
      'count_id', count_row.id,
      'matched', true,
      'stock_after', current_stock
    );
  end if;

  transaction_type :=
    case
      when variance_now > 0 then 'stock_adjustment_in'
      else 'stock_adjustment_out'
    end;

  transaction_result :=
    public.post_bos_material_inventory_transaction(
      count_row.material_listing_id,
      transaction_type,
      abs(variance_now),
      count_row.unit,
      null,
      'inventory_reconciliation',
      'physical_stock_count',
      count_row.id::text,
      'stock-reconciliation:' || count_row.id::text,
      coalesce(
        count_row.count_note,
        'Physical stock reconciliation'
      ),
      jsonb_build_object(
        'stock_count_id', count_row.id,
        'counted_system_stock', count_row.system_stock,
        'current_system_stock_before_reconciliation', current_stock,
        'physical_stock', count_row.physical_stock,
        'variance_at_reconciliation', variance_now,
        'human_confirmed', true
      )
    );

  transaction_id :=
    nullif(transaction_result->>'transaction_id','')::uuid;

  update public.bos_inventory_stock_counts
  set
    system_stock = current_stock,
    variance = variance_now,
    status = 'reconciled',
    reconciliation_transaction_id = transaction_id,
    reconciled_at = now(),
    updated_at = now()
  where id = count_row.id;

  return jsonb_build_object(
    'ok', true,
    'already_reconciled', false,
    'count_id', count_row.id,
    'matched', false,
    'variance', variance_now,
    'transaction_type', transaction_type,
    'transaction_id', transaction_id,
    'stock_before', transaction_result->'stock_before',
    'stock_after', transaction_result->'stock_after'
  );
end;
$$;

revoke all
on function public.reconcile_bos_material_stock_count(uuid)
from public, anon;

grant execute
on function public.reconcile_bos_material_stock_count(uuid)
to authenticated;

commit;
