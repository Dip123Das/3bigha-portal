begin;

-- ============================================================
-- COST-02C
-- Canonical Stock Issue Posting
--
-- Uses the same seller inventory source of truth already used by
-- billing:
--   material_listings.attributes.inventory.current_stock
-- and the same stock audit table:
--   inventory_stock_movements
--
-- Adds a controlled, idempotent COST posting function that:
--   1) locks the consumption intent
--   2) locks the owned material listing
--   3) validates sufficient stock
--   4) decrements current_stock
--   5) records inventory_stock_movements
--   6) records bos_cost_entries(material_issue)
--   7) marks the intent posted
--   8) refreshes bos_cost_plans.actual_total
-- ============================================================

alter table public.bos_cost_stock_consumption_intents
  add column if not exists posted_cost_entry_id uuid
    references public.bos_cost_entries(id) on delete set null;

alter table public.bos_cost_stock_consumption_intents
  add column if not exists posted_stock_movement_id uuid;

create unique index if not exists
  bos_cost_stock_consumption_intents_posted_entry_unique
on public.bos_cost_stock_consumption_intents(posted_cost_entry_id)
where posted_cost_entry_id is not null;

create or replace function public.post_bos_cost_stock_consumption(
  target_intent_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  intent_row public.bos_cost_stock_consumption_intents%rowtype;
  plan_owner uuid;
  listing_user uuid;
  listing_attributes jsonb;
  inventory_json jsonb;
  current_stock numeric;
  requested_qty numeric;
  purchase_rate numeric;
  issue_amount numeric;
  stock_unit text;
  movement_id uuid;
  cost_entry_id uuid;
  next_attributes jsonb;
  new_total numeric(18,2);
begin
  select *
  into intent_row
  from public.bos_cost_stock_consumption_intents
  where id = target_intent_id
  for update;

  if intent_row.id is null then
    raise exception 'Stock consumption intent not found';
  end if;

  if intent_row.user_id <> auth.uid() then
    raise exception 'Access denied';
  end if;

  if intent_row.status = 'posted' then
    return jsonb_build_object(
      'ok', true,
      'already_posted', true,
      'intent_id', intent_row.id,
      'cost_entry_id', intent_row.posted_cost_entry_id,
      'stock_movement_id', intent_row.posted_stock_movement_id
    );
  end if;

  if intent_row.status = 'cancelled' then
    raise exception 'Stock consumption intent is cancelled';
  end if;

  if intent_row.material_listing_id is null then
    raise exception 'Choose an owned inventory item before posting';
  end if;

  select user_id
  into plan_owner
  from public.bos_cost_plans
  where id = intent_row.plan_id;

  if plan_owner is null or plan_owner <> auth.uid() then
    raise exception 'Cost plan not found or access denied';
  end if;

  select vendor_user_id, attributes
  into listing_user, listing_attributes
  from public.material_listings
  where id = intent_row.material_listing_id
  for update;

  if listing_user is null or listing_user <> auth.uid() then
    raise exception 'Inventory item not found or does not belong to you';
  end if;

  inventory_json := coalesce(listing_attributes->'inventory', '{}'::jsonb);

  current_stock :=
    coalesce(
      nullif(inventory_json->>'current_stock', '')::numeric,
      0
    );

  requested_qty := coalesce(intent_row.requested_quantity, 0);

  if requested_qty <= 0 then
    raise exception 'Consumption quantity must be greater than zero';
  end if;

  if current_stock < requested_qty then
    raise exception
      'Insufficient stock. Available: %, requested: %',
      current_stock,
      requested_qty;
  end if;

  stock_unit := nullif(trim(coalesce(inventory_json->>'stock_unit', '')), '');

  if (
    stock_unit is not null
    and intent_row.unit is not null
    and lower(trim(stock_unit)) <> lower(trim(intent_row.unit))
  ) then
    raise exception
      'Unit mismatch. Inventory uses %, cost plan uses %',
      stock_unit,
      intent_row.unit;
  end if;

  purchase_rate :=
    coalesce(
      nullif(inventory_json->>'purchase_price', '')::numeric,
      0
    );

  issue_amount := round(requested_qty * purchase_rate, 2);

  next_attributes :=
    jsonb_set(
      coalesce(listing_attributes, '{}'::jsonb),
      '{inventory,current_stock}',
      to_jsonb(current_stock - requested_qty),
      true
    );

  update public.material_listings
  set attributes = next_attributes
  where id = intent_row.material_listing_id
    and vendor_user_id = auth.uid();

  -- Reuse the existing inventory audit table. The application already
  -- writes billing stock reductions here. 'offline_bill' is an existing
  -- accepted movement type in production; note/reference text identifies
  -- this movement as a COST stock issue until a dedicated movement enum
  -- is formally introduced in a later inventory-schema migration.
  insert into public.inventory_stock_movements (
    vendor_user_id,
    material_listing_id,
    movement_type,
    quantity,
    unit,
    note
  )
  values (
    auth.uid(),
    intent_row.material_listing_id,
    'offline_bill',
    -requested_qty,
    coalesce(intent_row.unit, stock_unit),
    '3BOS COST stock issue · intent ' || intent_row.id::text
  )
  returning id into movement_id;

  insert into public.bos_cost_entries (
    plan_id,
    plan_line_id,
    cost_centre_id,
    entry_date,
    entry_type,
    description,
    quantity,
    unit,
    rate,
    amount,
    source_reference_type,
    source_reference_id,
    metadata
  )
  select
    intent_row.plan_id,
    intent_row.plan_line_id,
    line.cost_centre_id,
    current_date,
    'material_issue',
    'Issued from owned inventory: ' || line.item_name,
    requested_qty,
    coalesce(intent_row.unit, stock_unit),
    purchase_rate,
    issue_amount,
    'inventory_stock_movement',
    movement_id::text,
    jsonb_build_object(
      'stock_consumption_intent_id', intent_row.id,
      'material_listing_id', intent_row.material_listing_id,
      'stock_before', current_stock,
      'stock_after', current_stock - requested_qty,
      'cost_basis', 'inventory_purchase_price'
    )
  from public.bos_cost_plan_lines line
  where line.id = intent_row.plan_line_id
    and line.plan_id = intent_row.plan_id
  returning id into cost_entry_id;

  if cost_entry_id is null then
    raise exception 'Cost plan line not found';
  end if;

  update public.bos_cost_stock_consumption_intents
  set
    status = 'posted',
    approved_at = coalesce(approved_at, now()),
    posted_at = now(),
    posted_cost_entry_id = cost_entry_id,
    posted_stock_movement_id = movement_id,
    updated_at = now()
  where id = intent_row.id;

  select coalesce(sum(amount), 0)::numeric(18,2)
  into new_total
  from public.bos_cost_entries
  where plan_id = intent_row.plan_id;

  update public.bos_cost_plans
  set
    actual_total = new_total,
    updated_at = now()
  where id = intent_row.plan_id
    and user_id = auth.uid();

  return jsonb_build_object(
    'ok', true,
    'already_posted', false,
    'intent_id', intent_row.id,
    'material_listing_id', intent_row.material_listing_id,
    'quantity_issued', requested_qty,
    'stock_before', current_stock,
    'stock_after', current_stock - requested_qty,
    'unit_cost', purchase_rate,
    'issue_amount', issue_amount,
    'cost_entry_id', cost_entry_id,
    'stock_movement_id', movement_id
  );
end;
$$;

revoke all
on function public.post_bos_cost_stock_consumption(uuid)
from public, anon;

grant execute
on function public.post_bos_cost_stock_consumption(uuid)
to authenticated;

commit;
