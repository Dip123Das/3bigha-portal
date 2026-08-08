begin;

-- ============================================================
-- BOS-OC1A
-- Identity-driven 3BOS Operating Capability Master
--
-- Constitutional rule:
-- identity_master remains the single source of identity.
-- This migration does NOT create another identity system.
--
-- Operating capabilities answer a different question:
-- "What internal 3BOS operating tools may this identity use?"
--
-- Marketplace / legacy modules remain separate.
-- ============================================================

create table if not exists public.bos_operating_capabilities (
  capability_key text primary key,
  label text not null,
  capability_group text not null,
  description text,
  default_path text,
  sort_order integer not null default 1000,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint bos_operating_capabilities_key_format
    check (capability_key ~ '^[a-z0-9_]+$')
);

comment on table public.bos_operating_capabilities is
  'Canonical 3BOS internal operating capability catalogue. Separate from identity and marketplace module catalogues.';

create table if not exists public.identity_bos_operating_capabilities (
  identity_key text not null
    references public.identity_master(identity_key)
    on update cascade
    on delete cascade,
  capability_key text not null
    references public.bos_operating_capabilities(capability_key)
    on update cascade
    on delete cascade,
  sort_order integer not null default 1000,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  primary key (identity_key, capability_key)
);

comment on table public.identity_bos_operating_capabilities is
  'Explicit Master Admin mapping from canonical identity_master identities to internal 3BOS operating capabilities.';

create index if not exists
  bos_operating_capabilities_active_sort_idx
on public.bos_operating_capabilities(is_active, capability_group, sort_order);

create index if not exists
  identity_bos_operating_capabilities_identity_idx
on public.identity_bos_operating_capabilities(identity_key, is_active);

create index if not exists
  identity_bos_operating_capabilities_capability_idx
on public.identity_bos_operating_capabilities(capability_key, is_active);

-- ============================================================
-- Initial capability catalogue
--
-- Costing capabilities deliberately do not publish routes yet.
-- BOS-OC1A must not create navigation to pages that do not exist.
-- ============================================================

insert into public.bos_operating_capabilities
  (capability_key, label, capability_group, description, default_path, sort_order, is_active)
values
  (
    'inventory_operations',
    'Inventory',
    'commerce',
    'Receive, hold, reserve, consume, transfer and dispatch stock according to the active business operating model.',
    '/dashboard/vendor/inventory',
    10,
    true
  ),
  (
    'product_costing',
    'Product Costing',
    'production',
    'Plan and control the cost of manufacturing a product or production batch.',
    null,
    20,
    true
  ),
  (
    'bom',
    'Bill of Materials',
    'production',
    'Define reusable material, service, labour and equipment requirements for manufactured products.',
    null,
    30,
    true
  ),
  (
    'production_operations',
    'Production Operations',
    'production',
    'Control planned production, material consumption, work in process and finished goods.',
    null,
    40,
    true
  ),
  (
    'project_costing',
    'Project Costing',
    'project',
    'Plan and control estimated, committed and actual project cost.',
    null,
    50,
    true
  ),
  (
    'boq',
    'Bill of Quantities',
    'project',
    'Define quantities, rates and cost heads for construction and infrastructure work.',
    null,
    60,
    true
  ),
  (
    'project_execution',
    'Project Execution',
    'project',
    'Connect project cost plans with procurement, site stock, work progress, billing and execution.',
    null,
    70,
    true
  )
on conflict (capability_key) do update
set
  label = excluded.label,
  capability_group = excluded.capability_group,
  description = excluded.description,
  default_path = excluded.default_path,
  sort_order = excluded.sort_order;

-- ============================================================
-- Initial explicit identity mappings
--
-- IMPORTANT:
-- These are explicit seeds, not name-pattern inference.
-- A new identity created later receives NO operating capability
-- until Master Admin maps it.
-- ============================================================

with seed(identity_key, capability_key, sort_order) as (
  values
    -- Trading / distribution: inventory, not manufacturing costing.
    ('wholesaler', 'inventory_operations', 10),
    ('distributor', 'inventory_operations', 10),
    ('dealer', 'inventory_operations', 10),
    ('retailer', 'inventory_operations', 10),
    ('supplier', 'inventory_operations', 10),
    ('importer', 'inventory_operations', 10),
    ('exporter', 'inventory_operations', 10),
    ('stockist', 'inventory_operations', 10),

    -- Manufacturing identities.
    ('manufacturer', 'inventory_operations', 10),
    ('manufacturer', 'product_costing', 20),
    ('manufacturer', 'bom', 30),
    ('manufacturer', 'production_operations', 40),

    ('factory', 'inventory_operations', 10),
    ('factory', 'product_costing', 20),
    ('factory', 'bom', 30),
    ('factory', 'production_operations', 40),

    ('processing_unit', 'inventory_operations', 10),
    ('processing_unit', 'product_costing', 20),
    ('processing_unit', 'bom', 30),
    ('processing_unit', 'production_operations', 40),

    ('workshop', 'inventory_operations', 10),
    ('workshop', 'product_costing', 20),
    ('workshop', 'bom', 30),
    ('workshop', 'production_operations', 40),

    ('msme_unit', 'inventory_operations', 10),
    ('msme_unit', 'product_costing', 20),
    ('msme_unit', 'bom', 30),
    ('msme_unit', 'production_operations', 40),

    ('industrial_enterprise', 'inventory_operations', 10),
    ('industrial_enterprise', 'product_costing', 20),
    ('industrial_enterprise', 'bom', 30),
    ('industrial_enterprise', 'production_operations', 40),

    ('fabricator', 'inventory_operations', 10),
    ('fabricator', 'product_costing', 20),
    ('fabricator', 'bom', 30),
    ('fabricator', 'production_operations', 40),

    ('food_processing', 'inventory_operations', 10),
    ('food_processing', 'product_costing', 20),
    ('food_processing', 'bom', 30),
    ('food_processing', 'production_operations', 40),

    -- Builder / construction project identities.
    ('builder', 'inventory_operations', 10),
    ('builder', 'project_costing', 20),
    ('builder', 'boq', 30),
    ('builder', 'project_execution', 40),

    ('builder_developer', 'inventory_operations', 10),
    ('builder_developer', 'project_costing', 20),
    ('builder_developer', 'boq', 30),
    ('builder_developer', 'project_execution', 40),

    ('civil_contractor', 'inventory_operations', 10),
    ('civil_contractor', 'project_costing', 20),
    ('civil_contractor', 'boq', 30),
    ('civil_contractor', 'project_execution', 40),

    ('epc_contractor', 'inventory_operations', 10),
    ('epc_contractor', 'project_costing', 20),
    ('epc_contractor', 'boq', 30),
    ('epc_contractor', 'project_execution', 40),

    ('interior_contractor', 'inventory_operations', 10),
    ('interior_contractor', 'project_costing', 20),
    ('interior_contractor', 'boq', 30),
    ('interior_contractor', 'project_execution', 40),

    ('infrastructure_company', 'inventory_operations', 10),
    ('infrastructure_company', 'project_costing', 20),
    ('infrastructure_company', 'boq', 30),
    ('infrastructure_company', 'project_execution', 40)
)
insert into public.identity_bos_operating_capabilities
  (identity_key, capability_key, sort_order, is_active)
select
  seed.identity_key,
  seed.capability_key,
  seed.sort_order,
  true
from seed
join public.identity_master identity_row
  on identity_row.identity_key = seed.identity_key
join public.bos_operating_capabilities capability_row
  on capability_row.capability_key = seed.capability_key
on conflict (identity_key, capability_key) do update
set
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- ============================================================
-- RLS
-- ============================================================

alter table public.bos_operating_capabilities enable row level security;
alter table public.identity_bos_operating_capabilities enable row level security;

grant select
on public.bos_operating_capabilities,
   public.identity_bos_operating_capabilities
to authenticated;

grant insert, update, delete
on public.bos_operating_capabilities,
   public.identity_bos_operating_capabilities
to authenticated;

drop policy if exists
  "Authenticated members read active BOS operating capabilities"
on public.bos_operating_capabilities;

create policy
  "Authenticated members read active BOS operating capabilities"
on public.bos_operating_capabilities
for select
to authenticated
using (
  is_active = true
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'master_admin'
  )
);

drop policy if exists
  "Master admin manages BOS operating capabilities"
on public.bos_operating_capabilities;

create policy
  "Master admin manages BOS operating capabilities"
on public.bos_operating_capabilities
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'master_admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'master_admin'
  )
);

drop policy if exists
  "Authenticated members read active identity BOS mappings"
on public.identity_bos_operating_capabilities;

create policy
  "Authenticated members read active identity BOS mappings"
on public.identity_bos_operating_capabilities
for select
to authenticated
using (
  is_active = true
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'master_admin'
  )
);

drop policy if exists
  "Master admin manages identity BOS mappings"
on public.identity_bos_operating_capabilities;

create policy
  "Master admin manages identity BOS mappings"
on public.identity_bos_operating_capabilities
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'master_admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'master_admin'
  )
);

commit;
