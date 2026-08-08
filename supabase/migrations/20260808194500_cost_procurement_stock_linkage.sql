begin;

-- ============================================================
-- COST-02B
-- Procurement & Existing Stock Consumption Linkage
--
-- Procurement:
--   planned BOM/BOQ demand -> existing RFQ workflow
--
-- Existing stock:
--   create a controlled consumption intent only.
--   Do NOT decrement material_listings inventory here because
--   no canonical stock-adjustment transaction API is yet verified.
-- ============================================================

create table if not exists public.bos_cost_procurement_handoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.bos_cost_plans(id) on delete cascade,
  plan_line_id uuid not null references public.bos_cost_plan_lines(id) on delete cascade,

  status text not null default 'prepared'
    check (status in ('prepared','opened','submitted','cancelled')),

  target_route text not null default '/rfq/new',
  idempotency_key text not null,

  requested_quantity numeric(18,4) not null default 0
    check (requested_quantity >= 0),
  unit text,
  handoff_payload jsonb not null default '{}'::jsonb,

  rfq_id uuid,
  prepared_at timestamptz not null default now(),
  opened_at timestamptz,
  submitted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, idempotency_key)
);

create index if not exists bos_cost_procurement_handoffs_plan_idx
  on public.bos_cost_procurement_handoffs(plan_id, plan_line_id, status);

alter table public.bos_cost_procurement_handoffs enable row level security;

grant select, insert, update, delete
on public.bos_cost_procurement_handoffs
to authenticated;

drop policy if exists "Members manage own cost procurement handoffs"
  on public.bos_cost_procurement_handoffs;

create policy "Members manage own cost procurement handoffs"
on public.bos_cost_procurement_handoffs
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.bos_cost_plans p
    where p.id = bos_cost_procurement_handoffs.plan_id
      and p.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.bos_cost_plans p
    where p.id = bos_cost_procurement_handoffs.plan_id
      and p.user_id = auth.uid()
  )
);

create table if not exists public.bos_cost_stock_consumption_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.bos_cost_plans(id) on delete cascade,
  plan_line_id uuid not null references public.bos_cost_plan_lines(id) on delete cascade,

  material_listing_id uuid,
  requested_quantity numeric(18,4) not null
    check (requested_quantity > 0),
  unit text,

  status text not null default 'prepared'
    check (status in ('prepared','approved','posted','cancelled')),

  note text,
  metadata jsonb not null default '{}'::jsonb,

  prepared_at timestamptz not null default now(),
  approved_at timestamptz,
  posted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.bos_cost_stock_consumption_intents is
  'Controlled intent to consume owned seller inventory for a BOM/BOQ line. Does not mutate material_listings stock until a canonical stock transaction mechanism is verified.';

create index if not exists bos_cost_stock_consumption_intents_plan_idx
  on public.bos_cost_stock_consumption_intents(plan_id, plan_line_id, status);

alter table public.bos_cost_stock_consumption_intents enable row level security;

grant select, insert, update, delete
on public.bos_cost_stock_consumption_intents
to authenticated;

drop policy if exists "Members manage own stock consumption intents"
  on public.bos_cost_stock_consumption_intents;

create policy "Members manage own stock consumption intents"
on public.bos_cost_stock_consumption_intents
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.bos_cost_plans p
    where p.id = bos_cost_stock_consumption_intents.plan_id
      and p.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.bos_cost_plans p
    where p.id = bos_cost_stock_consumption_intents.plan_id
      and p.user_id = auth.uid()
  )
);

commit;
