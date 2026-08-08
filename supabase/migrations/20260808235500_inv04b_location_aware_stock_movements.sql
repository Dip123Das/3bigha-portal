begin;

-- ============================================================
-- INV-04B — Location-Aware Canonical Stock Movements
--
-- Extends the existing canonical material posting RPC without
-- replacing it. Callers may pass:
--   target_metadata->>'location_id'
--
-- When present, the same atomic transaction updates the subordinate
-- location allocation. Existing callers remain backward compatible.
-- ============================================================

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

  requested_location_id uuid;
  requested_location_user uuid;
  location_quantity_before numeric;
  location_quantity_after numeric;
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
        'stock_after', existing_transaction.stock_after,
        'location_id', existing_transaction.metadata->>'location_id'
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

  -- Optional physical location synchronization.
  if coalesce(target_metadata->>'location_id','') <> '' then
    begin
      requested_location_id :=
        (target_metadata->>'location_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid inventory location id';
    end;

    select user_id
    into requested_location_user
    from public.bos_inventory_locations
    where id = requested_location_id
      and is_active = true;

    if requested_location_user is null
       or requested_location_user <> auth.uid() then
      raise exception 'Inventory location not found or access denied';
    end if;

    select quantity
    into location_quantity_before
    from public.bos_material_location_allocations
    where material_listing_id = target_material_listing_id
      and location_id = requested_location_id
    for update;

    location_quantity_before :=
      coalesce(location_quantity_before, 0);

    location_quantity_after :=
      location_quantity_before + signed_quantity;

    if affects_quantity
       and movement_direction = 'out'
       and location_quantity_after < 0 then
      raise exception
        'Insufficient stock at selected location. Available: %, requested: %',
        location_quantity_before,
        target_quantity;
    end if;
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

  if requested_location_id is not null and affects_quantity then
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
      requested_location_id,
      greatest(location_quantity_after, 0),
      coalesce(nullif(trim(target_unit),''),stock_unit)
    )
    on conflict (material_listing_id, location_id)
    do update set
      quantity = excluded.quantity,
      unit = excluded.unit,
      updated_at = now();
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
      || case
           when requested_location_id is null then '{}'::jsonb
           else jsonb_build_object(
             'location_id', requested_location_id,
             'location_quantity_before', location_quantity_before,
             'location_quantity_after', location_quantity_after
           )
         end
  )
  returning * into created_transaction;

  return jsonb_build_object(
    'ok', true,
    'already_posted', false,
    'transaction_id', created_transaction.id,
    'transaction_type', created_transaction.transaction_type,
    'quantity', created_transaction.quantity,
    'stock_before', created_transaction.stock_before,
    'stock_after', created_transaction.stock_after,
    'location_id', requested_location_id,
    'location_quantity_before', location_quantity_before,
    'location_quantity_after', location_quantity_after
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
