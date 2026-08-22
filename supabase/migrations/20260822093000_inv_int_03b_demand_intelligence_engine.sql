begin;

-- ============================================================
-- INV-INT-03B — Demand Intelligence Engine
--
-- Read-only deterministic demand intelligence derived from:
--   1. canonical inventory transaction ledger
--   2. canonical available-to-sell
--   3. canonical inventory intelligence
--   4. subordinate reservation commitments
--
-- This view never mutates stock and does not invent supplier
-- lead time, MOQ, seasonal multipliers or procurement outcomes.
-- ============================================================

create or replace view public.bos_material_inventory_demand_intelligence as
with outbound_history as (
  select
    t.user_id,
    t.inventory_entity_id as material_listing_id,

    min(t.occurred_at) as first_outbound_at,
    max(t.occurred_at) as last_outbound_at,

    count(*) filter (
      where t.occurred_at >= now() - interval '7 days'
    )::integer as outbound_events_7d,

    count(*) filter (
      where t.occurred_at >= now() - interval '30 days'
    )::integer as outbound_events_30d,

    count(*) filter (
      where t.occurred_at >= now() - interval '90 days'
    )::integer as outbound_events_90d,

    coalesce(
      sum(abs(t.quantity)) filter (
        where t.occurred_at >= now() - interval '7 days'
      ),
      0
    )::numeric(18,4) as demand_7d,

    coalesce(
      sum(abs(t.quantity)) filter (
        where t.occurred_at >= now() - interval '30 days'
      ),
      0
    )::numeric(18,4) as demand_30d,

    coalesce(
      sum(abs(t.quantity)) filter (
        where t.occurred_at >= now() - interval '90 days'
      ),
      0
    )::numeric(18,4) as demand_90d

  from public.bos_inventory_transactions t
  join public.bos_inventory_transaction_types tt
    on tt.transaction_type = t.transaction_type

  where t.inventory_domain = 'materials'
    and t.inventory_entity_type = 'material_listing'
    and tt.direction = 'out'
    and tt.affects_quantity = true
    and t.occurred_at >= now() - interval '90 days'

  group by
    t.user_id,
    t.inventory_entity_id
),

reservation_history as (
  select
    r.user_id,
    r.material_listing_id,

    count(*) filter (
      where r.created_at >= now() - interval '7 days'
    )::integer as reservation_events_7d,

    count(*) filter (
      where r.created_at >= now() - interval '30 days'
    )::integer as reservation_events_30d,

    count(*) filter (
      where r.created_at >= now() - interval '90 days'
    )::integer as reservation_events_90d,

    coalesce(
      sum(r.reserved_quantity) filter (
        where r.created_at >= now() - interval '7 days'
      ),
      0
    )::numeric(18,4) as reserved_demand_7d,

    coalesce(
      sum(r.reserved_quantity) filter (
        where r.created_at >= now() - interval '30 days'
      ),
      0
    )::numeric(18,4) as reserved_demand_30d,

    coalesce(
      sum(r.reserved_quantity) filter (
        where r.created_at >= now() - interval '90 days'
      ),
      0
    )::numeric(18,4) as reserved_demand_90d

  from public.bos_material_inventory_reservations r

  where r.created_at >= now() - interval '90 days'

  group by
    r.user_id,
    r.material_listing_id
),

demand_base as (
  select
    ii.user_id,
    ii.material_listing_id,
    ii.material_name,
    ii.sku,
    ii.unit,

    ii.on_hand_stock,
    ii.reserved_stock,
    ii.available_to_sell,
    ii.reorder_level,
    ii.purchase_price,
    ii.selling_price,
    ii.stock_status,
    ii.movement_velocity,
    ii.ageing_status,
    ii.risk_score,
    ii.risk_level,

    coalesce(oh.demand_7d, 0)::numeric(18,4) as demand_7d,
    coalesce(oh.demand_30d, 0)::numeric(18,4) as demand_30d,
    coalesce(oh.demand_90d, 0)::numeric(18,4) as demand_90d,

    coalesce(oh.outbound_events_7d, 0)::integer
      as outbound_events_7d,

    coalesce(oh.outbound_events_30d, 0)::integer
      as outbound_events_30d,

    coalesce(oh.outbound_events_90d, 0)::integer
      as outbound_events_90d,

    coalesce(rh.reserved_demand_7d, 0)::numeric(18,4)
      as reserved_demand_7d,

    coalesce(rh.reserved_demand_30d, 0)::numeric(18,4)
      as reserved_demand_30d,

    coalesce(rh.reserved_demand_90d, 0)::numeric(18,4)
      as reserved_demand_90d,

    coalesce(rh.reservation_events_7d, 0)::integer
      as reservation_events_7d,

    coalesce(rh.reservation_events_30d, 0)::integer
      as reservation_events_30d,

    coalesce(rh.reservation_events_90d, 0)::integer
      as reservation_events_90d,

    oh.first_outbound_at,
    oh.last_outbound_at,

    case
      when oh.first_outbound_at is null then 0
      else greatest(
        floor(
          extract(
            epoch from (
              now() - oh.first_outbound_at
            )
          ) / 86400
        ),
        1
      )
    end::integer as history_days

  from public.bos_material_inventory_intelligence ii

  left join outbound_history oh
    on oh.user_id = ii.user_id
   and oh.material_listing_id = ii.material_listing_id

  left join reservation_history rh
    on rh.user_id = ii.user_id
   and rh.material_listing_id = ii.material_listing_id
),

rate_base as (
  select
    db.*,

    round(
      db.demand_7d / 7,
      4
    )::numeric(18,4) as average_daily_demand_7d,

    round(
      db.demand_30d / 30,
      4
    )::numeric(18,4) as average_daily_demand_30d,

    round(
      db.demand_90d / 90,
      4
    )::numeric(18,4) as average_daily_demand_90d,

    round(
      (
        (db.demand_7d / 7) * 0.50
        +
        (db.demand_30d / 30) * 0.30
        +
        (db.demand_90d / 90) * 0.20
      ),
      4
    )::numeric(18,4) as weighted_average_daily_demand

  from demand_base db
),

forecast_base as (
  select
    rb.*,

    round(
      rb.weighted_average_daily_demand * 7,
      4
    )::numeric(18,4) as forecast_demand_7d,

    round(
      rb.weighted_average_daily_demand * 30,
      4
    )::numeric(18,4) as forecast_demand_30d,

    round(
      rb.weighted_average_daily_demand * 90,
      4
    )::numeric(18,4) as forecast_demand_90d,

    case
      when rb.average_daily_demand_30d <= 0
       and rb.average_daily_demand_7d <= 0
        then 'no_demand'

      when rb.average_daily_demand_7d
        >= rb.average_daily_demand_30d * 1.20
        then 'increasing'

      when rb.average_daily_demand_7d
        <= rb.average_daily_demand_30d * 0.80
        then 'falling'

      else 'stable'
    end as demand_trend,

    case
      when rb.weighted_average_daily_demand <= 0 then null
      else round(
        rb.available_to_sell
        / rb.weighted_average_daily_demand,
        1
      )
    end as stock_runway_days,

    case
      when rb.weighted_average_daily_demand <= 0 then null
      else (
        current_date
        +
        ceil(
          rb.available_to_sell
          / rb.weighted_average_daily_demand
        )::integer
      )
    end as predicted_depletion_date,

    case
      when rb.on_hand_stock <= 0 then 0
      else round(
        (
          rb.reserved_stock
          / rb.on_hand_stock
        ) * 100,
        1
      )
    end as reservation_pressure_percent,

    least(
      100,
      greatest(
        0,
        (
          case
            when rb.history_days >= 90 then 45
            when rb.history_days >= 30 then 30
            when rb.history_days >= 14 then 18
            when rb.history_days >= 7 then 10
            else 0
          end
          +
          case
            when rb.outbound_events_90d >= 20 then 35
            when rb.outbound_events_90d >= 10 then 25
            when rb.outbound_events_90d >= 5 then 15
            when rb.outbound_events_90d >= 1 then 5
            else 0
          end
          +
          case
            when rb.outbound_events_30d >= 3 then 20
            when rb.outbound_events_30d >= 1 then 10
            else 0
          end
        )
      )
    )::integer as forecast_confidence_score

  from rate_base rb
)

select
  fb.*,

  case
    when fb.forecast_confidence_score >= 75 then 'high'
    when fb.forecast_confidence_score >= 40 then 'medium'
    else 'low'
  end as forecast_confidence,

  case
    when fb.available_to_sell <= 0 then 'immediate'

    when fb.weighted_average_daily_demand > 0
     and fb.stock_runway_days <= 7
      then 'within_7_days'

    when fb.weighted_average_daily_demand > 0
     and fb.stock_runway_days <= 15
      then 'within_15_days'

    when fb.weighted_average_daily_demand > 0
     and fb.stock_runway_days <= 30
      then 'within_30_days'

    when fb.reorder_level > 0
     and fb.available_to_sell <= fb.reorder_level
      then 'within_30_days'

    else 'monitor'
  end as procurement_priority,

  greatest(
    round(
      (
        fb.forecast_demand_30d
        +
        greatest(fb.reorder_level, 0)
      )
      -
      fb.available_to_sell,
      4
    ),
    0
  )::numeric(18,4) as suggested_replenishment_quantity,

  case
    when fb.weighted_average_daily_demand <= 0 then null

    when fb.available_to_sell <= 0 then current_date

    else greatest(
      current_date,
      (
        current_date
        +
        floor(
          greatest(
            (
              fb.available_to_sell
              - greatest(fb.reorder_level, 0)
            )
            / fb.weighted_average_daily_demand,
            0
          )
        )::integer
      )
    )
  end as suggested_reorder_date

from forecast_base fb;

comment on view public.bos_material_inventory_demand_intelligence is
  'Read-only deterministic material demand, runway, confidence and replenishment-priority intelligence derived from canonical inventory transactions, ATS, reservations and inventory intelligence.';

grant select
on public.bos_material_inventory_demand_intelligence
to authenticated;

commit;
