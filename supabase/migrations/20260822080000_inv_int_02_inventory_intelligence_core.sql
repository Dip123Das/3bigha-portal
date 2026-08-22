begin;

-- ============================================================
-- INV-INT-02 — Inventory Intelligence Core
--
-- Read-only deterministic intelligence over the canonical
-- inventory balance, transaction ledger, reservations and
-- location-allocation integrity.
--
-- This view never mutates stock and does not introduce a second
-- inventory authority.
-- ============================================================

create or replace view public.bos_material_inventory_intelligence as
with material_base as (
  select
    ml.vendor_user_id as user_id,
    ml.id as material_listing_id,
    coalesce(
      nullif(trim(coalesce(ml.title, '')), ''),
      nullif(trim(coalesce(ml.local_name, '')), ''),
      nullif(trim(coalesce(ml.sku, '')), ''),
      'Inventory item'
    ) as material_name,
    ml.sku,
    ml.created_at,
    ml.updated_at,

    coalesce(
      nullif(ml.attributes->'inventory'->>'reorder_level', '')::numeric,
      0
    )::numeric(18,4) as reorder_level,

    coalesce(
      nullif(ml.attributes->'inventory'->>'purchase_price', '')::numeric,
      0
    )::numeric(18,4) as purchase_price,

    coalesce(
      nullif(ml.attributes->'inventory'->>'selling_price', '')::numeric,
      0
    )::numeric(18,4) as selling_price,

    nullif(
      trim(coalesce(ml.attributes->'inventory'->>'stock_unit', '')),
      ''
    ) as stock_unit

  from public.material_listings ml
),

movement_30d as (
  select
    t.user_id,
    t.inventory_entity_id as material_listing_id,

    coalesce(
      sum(
        case
          when tt.direction = 'in'
           and tt.affects_quantity = true
          then t.quantity
          else 0
        end
      ),
      0
    )::numeric(18,4) as stock_in_30d,

    coalesce(
      sum(
        case
          when tt.direction = 'out'
           and tt.affects_quantity = true
          then t.quantity
          else 0
        end
      ),
      0
    )::numeric(18,4) as stock_out_30d,

    count(*) filter (
      where tt.affects_quantity = true
    )::integer as movement_count_30d,

    max(t.occurred_at) filter (
      where tt.affects_quantity = true
    ) as last_movement_at

  from public.bos_inventory_transactions t
  join public.bos_inventory_transaction_types tt
    on tt.transaction_type = t.transaction_type
  where t.inventory_domain = 'materials'
    and t.inventory_entity_type = 'material_listing'
    and t.occurred_at >= now() - interval '30 days'
  group by
    t.user_id,
    t.inventory_entity_id
),

movement_all_time as (
  select
    t.user_id,
    t.inventory_entity_id as material_listing_id,
    max(t.occurred_at) filter (
      where tt.affects_quantity = true
    ) as last_quantity_movement_at
  from public.bos_inventory_transactions t
  join public.bos_inventory_transaction_types tt
    on tt.transaction_type = t.transaction_type
  where t.inventory_domain = 'materials'
    and t.inventory_entity_type = 'material_listing'
  group by
    t.user_id,
    t.inventory_entity_id
),

intelligence_base as (
select
  mb.user_id,
  mb.material_listing_id,
  mb.material_name,
  mb.sku,

  ats.on_hand_stock,
  ats.reserved_stock,
  ats.available_to_sell,
  coalesce(ats.unit, mb.stock_unit) as unit,

  mb.reorder_level,
  mb.purchase_price,
  mb.selling_price,

  coalesce(m30.stock_in_30d, 0)::numeric(18,4) as stock_in_30d,
  coalesce(m30.stock_out_30d, 0)::numeric(18,4) as stock_out_30d,
  coalesce(m30.movement_count_30d, 0)::integer as movement_count_30d,

  coalesce(
    ma.last_quantity_movement_at,
    mb.created_at
  ) as last_movement_at,

  greatest(
    floor(
      extract(
        epoch from (
          now() - coalesce(ma.last_quantity_movement_at, mb.created_at)
        )
      ) / 86400
    ),
    0
  )::integer as stock_age_days,

  case
    when ats.on_hand_stock <= 0 then 'out_of_stock'
    when ats.available_to_sell <= 0 then 'fully_reserved'
    when mb.reorder_level > 0
     and ats.available_to_sell <= mb.reorder_level
      then 'low_stock'
    else 'healthy'
  end as stock_status,

  case
    when coalesce(m30.stock_out_30d, 0) <= 0 then 'no_movement'
    when coalesce(m30.stock_out_30d, 0) >= greatest(mb.reorder_level * 2, 10)
      then 'fast'
    when coalesce(m30.stock_out_30d, 0) >= greatest(mb.reorder_level, 5)
      then 'normal'
    else 'slow'
  end as movement_velocity,

  case
    when ats.on_hand_stock > 0
     and coalesce(ma.last_quantity_movement_at, mb.created_at)
       <= now() - interval '90 days'
      then 'dead_stock'
    when ats.on_hand_stock > 0
     and coalesce(ma.last_quantity_movement_at, mb.created_at)
       <= now() - interval '30 days'
      then 'slow_moving'
    else 'active'
  end as ageing_status,

  greatest(
    case
      when mb.reorder_level > 0
      then (mb.reorder_level * 2) - ats.available_to_sell
      else 0
    end,
    0
  )::numeric(18,4) as suggested_reorder_quantity,

  coalesce(li.allocated_stock, 0)::numeric(18,4) as allocated_stock,
  coalesce(li.allocation_drift, ats.on_hand_stock)::numeric(18,4)
    as allocation_drift,

  case
    when coalesce(li.allocation_drift, ats.on_hand_stock) = 0
      then true
    else false
  end as location_balanced,

  round(
    (
      case
        when ats.on_hand_stock <= 0 then 35
        when ats.available_to_sell <= 0 then 30
        when mb.reorder_level > 0
         and ats.available_to_sell <= mb.reorder_level then 20
        else 0
      end
      +
      case
        when ats.on_hand_stock > 0
         and coalesce(ma.last_quantity_movement_at, mb.created_at)
           <= now() - interval '90 days' then 30
        when ats.on_hand_stock > 0
         and coalesce(ma.last_quantity_movement_at, mb.created_at)
           <= now() - interval '30 days' then 15
        else 0
      end
      +
      case
        when coalesce(li.allocation_drift, ats.on_hand_stock) <> 0
          then 20
        else 0
      end
      +
      case
        when ats.on_hand_stock > 0
         and ats.reserved_stock / ats.on_hand_stock >= 0.8
          then 15
        when ats.on_hand_stock > 0
         and ats.reserved_stock / ats.on_hand_stock >= 0.5
          then 8
        else 0
      end
    )::numeric,
    0
  )::integer as risk_score

from material_base mb
join public.bos_material_available_to_sell ats
  on ats.user_id = mb.user_id
 and ats.material_listing_id = mb.material_listing_id
left join movement_30d m30
  on m30.user_id = mb.user_id
 and m30.material_listing_id = mb.material_listing_id
left join movement_all_time ma
  on ma.user_id = mb.user_id
 and ma.material_listing_id = mb.material_listing_id
left join public.bos_material_location_integrity li
  on li.user_id = mb.user_id
 and li.material_listing_id = mb.material_listing_id
)

select
  ib.*,
  case
    when ib.risk_score >= 50 then 'high'
    when ib.risk_score >= 20 then 'medium'
    else 'low'
  end as risk_level
from intelligence_base ib;

comment on view public.bos_material_inventory_intelligence is
  'Read-only deterministic inventory intelligence derived from canonical material stock, ATS, transaction ledger and location integrity.';

grant select
on public.bos_material_inventory_intelligence
to authenticated;

commit;
