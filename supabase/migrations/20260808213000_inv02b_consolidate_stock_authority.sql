begin;

-- ============================================================
-- INV-02B — Consolidate Billing + COST onto canonical
-- inventory transaction authority
-- ============================================================

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
  requested_qty numeric;
  purchase_rate numeric;
  stock_unit text;
  inventory_result jsonb;
  inventory_transaction_id uuid;
  cost_entry_id uuid;
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
  where id = intent_row.material_listing_id;

  if listing_user is null or listing_user <> auth.uid() then
    raise exception 'Inventory item not found or does not belong to you';
  end if;

  inventory_json := coalesce(listing_attributes->'inventory', '{}'::jsonb);

  requested_qty := coalesce(intent_row.requested_quantity, 0);
  if requested_qty <= 0 then
    raise exception 'Consumption quantity must be greater than zero';
  end if;

  stock_unit := nullif(trim(coalesce(inventory_json->>'stock_unit', '')), '');

  purchase_rate :=
    coalesce(
      nullif(inventory_json->>'purchase_price', '')::numeric,
      0
    );

  inventory_result :=
    public.post_bos_material_inventory_transaction(
      intent_row.material_listing_id,
      'material_issue',
      requested_qty,
      coalesce(intent_row.unit, stock_unit),
      purchase_rate,
      'cost_register',
      'cost_stock_consumption_intent',
      intent_row.id::text,
      'cost-intent:' || intent_row.id::text,
      'Issued from owned inventory to production/project',
      jsonb_build_object(
        'plan_id', intent_row.plan_id,
        'plan_line_id', intent_row.plan_line_id,
        'stock_consumption_intent_id', intent_row.id
      )
    );

  inventory_transaction_id :=
    nullif(inventory_result->>'transaction_id', '')::uuid;

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
    round(requested_qty * purchase_rate, 2),
    'bos_inventory_transaction',
    inventory_transaction_id::text,
    jsonb_build_object(
      'stock_consumption_intent_id', intent_row.id,
      'material_listing_id', intent_row.material_listing_id,
      'inventory_transaction_id', inventory_transaction_id,
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
    posted_stock_movement_id = inventory_transaction_id,
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
    'stock_before', inventory_result->'stock_before',
    'stock_after', inventory_result->'stock_after',
    'unit_cost', purchase_rate,
    'issue_amount', round(requested_qty * purchase_rate, 2),
    'cost_entry_id', cost_entry_id,
    'stock_movement_id', inventory_transaction_id
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
