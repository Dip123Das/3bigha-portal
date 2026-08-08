begin;

-- ============================================================
-- INV-04C — Location Allocation Integrity & Drift Reconciliation
--
-- Canonical current_stock remains authoritative.
-- This phase detects differences between canonical stock and the sum
-- of physical location allocations, then lets a human assign only
-- the drift to a chosen location. It never changes canonical stock.
-- ============================================================

create or replace view public.bos_material_location_integrity as
select
  ml.vendor_user_id as user_id,
  ml.id as material_listing_id,
  coalesce(
    nullif(ml.attributes->'inventory'->>'current_stock','')::numeric,
    0
  )::numeric(18,4) as canonical_stock,
  coalesce(sum(a.quantity),0)::numeric(18,4) as allocated_stock,
  (
    coalesce(
      nullif(ml.attributes->'inventory'->>'current_stock','')::numeric,
      0
    )
    - coalesce(sum(a.quantity),0)
  )::numeric(18,4) as allocation_drift,
  nullif(trim(coalesce(ml.attributes->'inventory'->>'stock_unit','')), '') as unit
from public.material_listings ml
left join public.bos_material_location_allocations a
  on a.material_listing_id = ml.id
group by
  ml.vendor_user_id,
  ml.id,
  ml.attributes;

comment on view public.bos_material_location_integrity is
  'Read-only comparison of canonical material stock versus subordinate physical location allocations.';

grant select
on public.bos_material_location_integrity
to authenticated;

create or replace function public.reconcile_bos_material_location_drift(
  target_material_listing_id uuid,
  target_location_id uuid,
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
  canonical_stock numeric;
  stock_unit text;

  location_user uuid;
  allocated_stock numeric;
  drift numeric;
  location_before numeric;
  location_after numeric;
begin
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
  into allocated_stock
  from public.bos_material_location_allocations
  where material_listing_id = target_material_listing_id;

  drift := canonical_stock - allocated_stock;

  if drift = 0 then
    return jsonb_build_object(
      'ok', true,
      'already_balanced', true,
      'material_listing_id', target_material_listing_id,
      'canonical_stock', canonical_stock,
      'allocated_stock', allocated_stock,
      'allocation_drift', 0,
      'unit', stock_unit
    );
  end if;

  select quantity
  into location_before
  from public.bos_material_location_allocations
  where material_listing_id = target_material_listing_id
    and location_id = target_location_id
  for update;

  location_before := coalesce(location_before,0);
  location_after := location_before + drift;

  if location_after < 0 then
    raise exception
      'Selected location cannot absorb negative drift. Location stock: %, drift: %',
      location_before,
      drift;
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
    location_after,
    stock_unit
  )
  on conflict (material_listing_id, location_id)
  do update set
    quantity = excluded.quantity,
    unit = excluded.unit,
    updated_at = now();

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
    case when drift > 0 then 'stock_adjustment_in' else 'stock_adjustment_out' end,
    0,
    stock_unit,
    canonical_stock,
    canonical_stock,
    'inventory_location_integrity',
    'location_allocation_reconciliation',
    target_location_id::text,
    'location-allocation-reconciliation:' ||
      target_material_listing_id::text || ':' ||
      target_location_id::text || ':' ||
      floor(extract(epoch from clock_timestamp()) * 1000)::text,
    coalesce(
      nullif(trim(coalesce(target_note,'')), ''),
      'Physical location allocation reconciled to canonical stock'
    ),
    jsonb_build_object(
      'location_allocation_only', true,
      'canonical_stock_unchanged', true,
      'location_id', target_location_id,
      'allocation_drift', drift,
      'allocated_stock_before', allocated_stock,
      'location_quantity_before', location_before,
      'location_quantity_after', location_after
    )
  );

  return jsonb_build_object(
    'ok', true,
    'already_balanced', false,
    'material_listing_id', target_material_listing_id,
    'canonical_stock', canonical_stock,
    'allocated_stock_before', allocated_stock,
    'allocation_drift', drift,
    'location_id', target_location_id,
    'location_quantity_before', location_before,
    'location_quantity_after', location_after,
    'allocated_stock_after', canonical_stock,
    'unit', stock_unit
  );
end;
$$;

revoke all
on function public.reconcile_bos_material_location_drift(uuid,uuid,text)
from public, anon;

grant execute
on function public.reconcile_bos_material_location_drift(uuid,uuid,text)
to authenticated;

commit;
