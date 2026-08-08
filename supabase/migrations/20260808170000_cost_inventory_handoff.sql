begin;

-- ============================================================
-- COST-01E
-- Finished Output -> Existing Inventory Handoff
--
-- Constitutional rule:
--   COST does not become another sellable inventory system.
--   It stages completed production/project outputs and records
--   a controlled human-confirmed handoff to the existing inventory.
-- ============================================================

create table if not exists public.bos_cost_inventory_handoffs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.bos_cost_plans(id) on delete cascade,
  output_id uuid not null references public.bos_cost_outputs(id) on delete cascade,

  target_inventory text not null
    check (
      target_inventory in (
        'seller_material_inventory',
        'builder_property_unit_inventory'
      )
    ),

  target_route text not null,

  status text not null default 'prepared'
    check (
      status in (
        'prepared',
        'opened',
        'confirmed',
        'cancelled'
      )
    ),

  -- A stable key makes preparation idempotent for the same output.
  idempotency_key text not null,

  destination_record_id uuid,

  handoff_payload jsonb not null default '{}'::jsonb,

  prepared_at timestamptz not null default now(),
  opened_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, idempotency_key)
);

comment on table public.bos_cost_inventory_handoffs is
  'Controlled, human-confirmed handoff from completed cost outputs into the existing seller/property inventories. It does not replace destination inventory records.';

create unique index if not exists
  bos_cost_inventory_handoffs_active_output_unique
on public.bos_cost_inventory_handoffs(output_id)
where status in ('prepared', 'opened', 'confirmed');

create index if not exists
  bos_cost_inventory_handoffs_user_status_idx
on public.bos_cost_inventory_handoffs(user_id, status, created_at desc);

alter table public.bos_cost_inventory_handoffs enable row level security;

grant select, insert, update, delete
on public.bos_cost_inventory_handoffs
to authenticated;

drop policy if exists "Members manage own cost inventory handoffs"
  on public.bos_cost_inventory_handoffs;

create policy "Members manage own cost inventory handoffs"
on public.bos_cost_inventory_handoffs
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.bos_cost_plans plan
    where plan.id = bos_cost_inventory_handoffs.plan_id
      and plan.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.bos_cost_outputs output
    where output.id = bos_cost_inventory_handoffs.output_id
      and output.plan_id = bos_cost_inventory_handoffs.plan_id
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.bos_cost_plans plan
    where plan.id = bos_cost_inventory_handoffs.plan_id
      and plan.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.bos_cost_outputs output
    where output.id = bos_cost_inventory_handoffs.output_id
      and output.plan_id = bos_cost_inventory_handoffs.plan_id
  )
);

commit;
