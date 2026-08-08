begin;

-- ============================================================
-- COST-01A v2
-- Universal Production & Project Cost Inventory Foundation
--
-- Flow:
--   Procurement / wages / utilities / other inputs
--        -> Cost Inventory / Production Register
--        -> Manufactured or constructed outputs
--        -> Existing Seller Inventory / Property Unit Inventory
--        -> Billing / challan / dispatch / sales
--
-- Product mode:
--   furniture, machine, packaged goods, fabricated items, etc.
--
-- Project mode:
--   society, apartment towers, plots, shops, offices, roads,
--   drains and other builder / construction work.
--
-- The existing Construction Cost Calculator remains the estimate
-- engine for builder projects and may feed this ledger.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.bos_cost_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  operating_mode text not null
    check (operating_mode in ('product', 'project')),

  title text not null,
  description text,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'planned',
        'active',
        'production',
        'execution',
        'completed',
        'archived'
      )
    ),

  version_no integer not null default 1
    check (version_no >= 1),

  currency_code text not null default 'INR',

  -- Product example:
  -- 10 sweet display counters.
  target_output_quantity numeric(18,4),
  target_output_unit text,

  -- Optional connection to existing 3Bigha systems.
  source_system text,
  source_entity_type text,
  source_entity_id uuid,
  source_snapshot_id uuid,

  estimated_total numeric(18,2) not null default 0,
  revised_total numeric(18,2) not null default 0,
  committed_total numeric(18,2) not null default 0,
  actual_total numeric(18,2) not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bos_cost_plans_title_nonempty
    check (length(trim(title)) >= 2)
);

comment on table public.bos_cost_plans is
  'Universal production/project cost inventory header. Product mode tracks manufacturing cost; project mode tracks builder/construction cost.';

comment on column public.bos_cost_plans.source_system is
  'Optional estimate/source engine, e.g. construction_cost_calculator.';

create index if not exists bos_cost_plans_user_mode_status_idx
  on public.bos_cost_plans(user_id, operating_mode, status, updated_at desc);

create index if not exists bos_cost_plans_source_idx
  on public.bos_cost_plans(source_system, source_entity_type, source_entity_id)
  where source_entity_id is not null;

-- ============================================================
-- Cost centres / work packages
--
-- Product examples:
--   Raw frame, glass work, electrical, finishing, packaging.
--
-- Builder examples:
--   Tower A, Tower B, Internal Roads, Drainage, Plot Development,
--   Commercial Block, Common Amenities.
-- ============================================================

create table if not exists public.bos_cost_centres (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.bos_cost_plans(id) on delete cascade,
  parent_cost_centre_id uuid references public.bos_cost_centres(id) on delete cascade,

  centre_key text,
  label text not null,
  centre_type text not null default 'work_package'
    check (
      centre_type in (
        'product_batch',
        'work_package',
        'building',
        'tower',
        'road',
        'drainage',
        'plot_development',
        'commercial_block',
        'amenity',
        'department',
        'other'
      )
    ),

  description text,
  planned_quantity numeric(18,4),
  unit text,
  sort_order integer not null default 1000,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.bos_cost_centres is
  'Cost allocation centres/work packages within a production batch or construction project.';

create index if not exists bos_cost_centres_plan_sort_idx
  on public.bos_cost_centres(plan_id, sort_order);

-- ============================================================
-- Planned BOQ / BOM / cost lines
-- ============================================================

create table if not exists public.bos_cost_plan_sections (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.bos_cost_plans(id) on delete cascade,
  parent_section_id uuid references public.bos_cost_plan_sections(id) on delete cascade,

  section_key text,
  label text not null,
  description text,
  sort_order integer not null default 1000,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bos_cost_plan_sections_label_nonempty
    check (length(trim(label)) >= 1)
);

create index if not exists bos_cost_plan_sections_plan_sort_idx
  on public.bos_cost_plan_sections(plan_id, sort_order);

create table if not exists public.bos_cost_plan_lines (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.bos_cost_plans(id) on delete cascade,
  section_id uuid references public.bos_cost_plan_sections(id) on delete set null,
  cost_centre_id uuid references public.bos_cost_centres(id) on delete set null,

  line_type text not null
    check (
      line_type in (
        'raw_material',
        'consumable',
        'labour',
        'wages',
        'electricity',
        'fuel',
        'equipment',
        'machinery',
        'rental',
        'service',
        'professional_fee',
        'subcontract',
        'transport',
        'logistics',
        'statutory_fee',
        'finance_cost',
        'overhead',
        'tax',
        'contingency',
        'other'
      )
    ),

  item_name text not null,
  description text,

  quantity numeric(18,4) not null default 0 check (quantity >= 0),
  unit text not null default 'unit',

  wastage_percent numeric(9,4) not null default 0 check (wastage_percent >= 0),

  estimated_rate numeric(18,4) not null default 0 check (estimated_rate >= 0),
  revised_rate numeric(18,4) not null default 0 check (revised_rate >= 0),

  estimated_amount numeric(18,2) not null default 0,
  revised_amount numeric(18,2) not null default 0,

  item_reference_type text,
  item_reference_id text,

  source_context jsonb not null default '{}'::jsonb,
  sort_order integer not null default 1000,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bos_cost_plan_lines_item_nonempty
    check (length(trim(item_name)) >= 1)
);

comment on table public.bos_cost_plan_lines is
  'Planned BOM/BOQ/cost requirements before and during manufacturing or construction.';

create index if not exists bos_cost_plan_lines_plan_sort_idx
  on public.bos_cost_plan_lines(plan_id, sort_order);

create index if not exists bos_cost_plan_lines_centre_type_idx
  on public.bos_cost_plan_lines(cost_centre_id, line_type);

-- ============================================================
-- Actual production / project expenditure register
--
-- This is the user's day-to-day register:
-- purchases, worker wages, electricity, rentals, fuel, services,
-- transport and every other cost actually incurred.
-- ============================================================

create table if not exists public.bos_cost_entries (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.bos_cost_plans(id) on delete cascade,
  plan_line_id uuid references public.bos_cost_plan_lines(id) on delete set null,
  cost_centre_id uuid references public.bos_cost_centres(id) on delete set null,

  entry_date date not null default current_date,

  entry_type text not null
    check (
      entry_type in (
        'purchase',
        'material_issue',
        'material_return',
        'wage',
        'salary',
        'electricity',
        'fuel',
        'equipment',
        'rental',
        'service',
        'professional_fee',
        'subcontract',
        'transport',
        'statutory_fee',
        'finance_cost',
        'overhead',
        'tax',
        'adjustment',
        'other'
      )
    ),

  description text not null,

  quantity numeric(18,4) not null default 0 check (quantity >= 0),
  unit text,
  rate numeric(18,4) not null default 0 check (rate >= 0),
  amount numeric(18,2) not null default 0,

  counterparty_name text,
  document_type text,
  document_number text,

  source_reference_type text,
  source_reference_id text,

  notes text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.bos_cost_entries is
  'Actual production/project cost register: procurement, wages, electricity, fuel, rentals, services, fees and all other expenditure.';

create index if not exists bos_cost_entries_plan_date_idx
  on public.bos_cost_entries(plan_id, entry_date desc, created_at desc);

create index if not exists bos_cost_entries_centre_type_idx
  on public.bos_cost_entries(cost_centre_id, entry_type);

-- ============================================================
-- Outputs / finished goods / constructed sellable units
--
-- Manufacturing:
--   10 sweet display counters -> ready for seller inventory.
--
-- Builder:
--   apartments / land plots / shops / offices -> ready for
--   existing property unit inventory.
--
-- Roads/drains/common works can remain project cost centres and
-- are not required to become seller inventory.
-- ============================================================

create table if not exists public.bos_cost_outputs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.bos_cost_plans(id) on delete cascade,
  cost_centre_id uuid references public.bos_cost_centres(id) on delete set null,

  output_type text not null
    check (
      output_type in (
        'finished_good',
        'apartment',
        'land_plot',
        'shop',
        'office',
        'commercial_unit',
        'villa',
        'house',
        'other_sellable_unit',
        'non_sellable_project_asset'
      )
    ),

  output_name text not null,
  output_code text,

  planned_quantity numeric(18,4) not null default 0 check (planned_quantity >= 0),
  completed_quantity numeric(18,4) not null default 0 check (completed_quantity >= 0),
  unit text not null default 'unit',

  allocated_cost numeric(18,2) not null default 0,
  unit_production_cost numeric(18,4) not null default 0,

  completion_status text not null default 'planned'
    check (
      completion_status in (
        'planned',
        'in_progress',
        'completed',
        'ready_for_inventory',
        'partially_transferred',
        'transferred'
      )
    ),

  -- Destination after production/construction.
  target_inventory_type text
    check (
      target_inventory_type is null
      or target_inventory_type in (
        'seller_material_inventory',
        'builder_property_unit_inventory'
      )
    ),

  target_inventory_reference_id text,
  transferred_quantity numeric(18,4) not null default 0
    check (transferred_quantity >= 0),
  transferred_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.bos_cost_outputs is
  'Finished outputs from manufacturing/construction before and after transfer to existing seller/property inventory.';

create index if not exists bos_cost_outputs_plan_status_idx
  on public.bos_cost_outputs(plan_id, completion_status);

-- ============================================================
-- Revisions
-- ============================================================

create table if not exists public.bos_cost_plan_revisions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.bos_cost_plans(id) on delete cascade,

  version_no integer not null,
  reason text,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),

  unique(plan_id, version_no)
);

-- ============================================================
-- RLS: owner isolation.
-- Capability checks are enforced by canonical APIs/pages in
-- subsequent COST phases.
-- ============================================================

alter table public.bos_cost_plans enable row level security;
alter table public.bos_cost_centres enable row level security;
alter table public.bos_cost_plan_sections enable row level security;
alter table public.bos_cost_plan_lines enable row level security;
alter table public.bos_cost_entries enable row level security;
alter table public.bos_cost_outputs enable row level security;
alter table public.bos_cost_plan_revisions enable row level security;

grant select, insert, update, delete
on public.bos_cost_plans,
   public.bos_cost_centres,
   public.bos_cost_plan_sections,
   public.bos_cost_plan_lines,
   public.bos_cost_entries,
   public.bos_cost_outputs,
   public.bos_cost_plan_revisions
to authenticated;

drop policy if exists "Members manage own BOS cost plans" on public.bos_cost_plans;
create policy "Members manage own BOS cost plans"
on public.bos_cost_plans for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Members manage own BOS cost centres" on public.bos_cost_centres;
create policy "Members manage own BOS cost centres"
on public.bos_cost_centres for all to authenticated
using (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_centres.plan_id
      and plan.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_centres.plan_id
      and plan.user_id = auth.uid()
  )
);

drop policy if exists "Members manage own BOS cost plan sections" on public.bos_cost_plan_sections;
create policy "Members manage own BOS cost plan sections"
on public.bos_cost_plan_sections for all to authenticated
using (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_plan_sections.plan_id
      and plan.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_plan_sections.plan_id
      and plan.user_id = auth.uid()
  )
);

drop policy if exists "Members manage own BOS cost plan lines" on public.bos_cost_plan_lines;
create policy "Members manage own BOS cost plan lines"
on public.bos_cost_plan_lines for all to authenticated
using (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_plan_lines.plan_id
      and plan.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_plan_lines.plan_id
      and plan.user_id = auth.uid()
  )
);

drop policy if exists "Members manage own BOS cost entries" on public.bos_cost_entries;
create policy "Members manage own BOS cost entries"
on public.bos_cost_entries for all to authenticated
using (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_entries.plan_id
      and plan.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_entries.plan_id
      and plan.user_id = auth.uid()
  )
);

drop policy if exists "Members manage own BOS cost outputs" on public.bos_cost_outputs;
create policy "Members manage own BOS cost outputs"
on public.bos_cost_outputs for all to authenticated
using (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_outputs.plan_id
      and plan.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_outputs.plan_id
      and plan.user_id = auth.uid()
  )
);

drop policy if exists "Members read own BOS cost plan revisions" on public.bos_cost_plan_revisions;
create policy "Members read own BOS cost plan revisions"
on public.bos_cost_plan_revisions for select to authenticated
using (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_plan_revisions.plan_id
      and plan.user_id = auth.uid()
  )
);

drop policy if exists "Members create own BOS cost plan revisions" on public.bos_cost_plan_revisions;
create policy "Members create own BOS cost plan revisions"
on public.bos_cost_plan_revisions for insert to authenticated
with check (
  exists (
    select 1 from public.bos_cost_plans plan
    where plan.id = bos_cost_plan_revisions.plan_id
      and plan.user_id = auth.uid()
  )
);

commit;
