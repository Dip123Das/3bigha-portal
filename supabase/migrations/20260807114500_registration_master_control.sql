begin;

-- ============================================================
-- CRS-4A
-- Canonical Registration Master
--
-- identity_master remains the single catalogue for human /
-- business / professional identities.
--
-- These columns only describe where an identity is allowed
-- to appear during registration.
-- ============================================================

alter table public.identity_master
  add column if not exists registration_scopes text[]
    not null default '{}'::text[],

  add column if not exists lifetime_free_candidate boolean
    not null default false,

  add column if not exists redirect_to_business boolean
    not null default false;

comment on column public.identity_master.registration_scopes is
  'Registration surfaces where this canonical identity may appear: business_identity, business_personal_role, individual_skill.';

comment on column public.identity_master.lifetime_free_candidate is
  'Whether this identity may enter the constitutional lifetime-free skilled-worker verification pathway.';

comment on column public.identity_master.redirect_to_business is
  'When true, this identity belongs to the Business / Organisation pathway rather than the Individual Skilled Professional pathway.';

create index if not exists
  identity_master_registration_scopes_idx
on public.identity_master
using gin(registration_scopes);


-- ============================================================
-- LEGAL CONSTITUTIONS
-- These are not human identities and therefore do NOT belong
-- in identity_master.
-- ============================================================

create table if not exists public.registration_legal_constitutions (
  key text primary key,

  label text not null,
  description text,

  sort_order integer not null default 1000,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.registration_legal_constitutions is
  'Canonical legal constitutions available to Business Registration.';


-- ============================================================
-- BUSINESS SECTORS
-- A sector groups identities; it is not itself an identity.
-- ============================================================

create table if not exists public.registration_business_sectors (
  key text primary key,

  title text not null,
  description text,
  symbol text,

  sort_order integer not null default 1000,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.registration_business_sectors is
  'Canonical Business Registration sector catalogue.';


-- ============================================================
-- IDENTITY ↔ SECTOR MAPPING
-- An identity may appear in more than one sector without
-- creating duplicate identity records.
-- ============================================================

create table if not exists public.registration_identity_sector_map (
  identity_key text not null
    references public.identity_master(identity_key)
    on update cascade
    on delete cascade,

  sector_key text not null
    references public.registration_business_sectors(key)
    on update cascade
    on delete restrict,

  nature_modules text[] not null default '{}'::text[],

  sort_order integer not null default 1000,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (identity_key, sector_key)
);

comment on table public.registration_identity_sector_map is
  'Maps canonical identities into Business Registration sectors and marketplace modules without duplicating identities.';


-- ============================================================
-- LEGAL CONSTITUTION SEED
--
-- IMPORTANT:
-- "Individual Professional" is deliberately NOT a legal
-- constitution anymore. Individual skilled work has its own
-- registration pathway.
-- ============================================================

insert into public.registration_legal_constitutions
  (key, label, sort_order)
values
  ('proprietorship', 'Proprietorship', 10),
  ('partnership', 'Partnership', 20),
  ('llp', 'LLP', 30),
  ('private_limited', 'Private Limited', 40),
  ('public_limited', 'Public Limited', 50),
  ('opc', 'OPC', 60),
  ('society', 'Society', 70),
  ('trust', 'Trust', 80),
  ('government', 'Government', 90),
  ('cooperative', 'Cooperative', 100)
on conflict (key) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order;


-- ============================================================
-- BUSINESS SECTOR SEED
-- Mirrors the real Business Registration presently running.
-- ============================================================

insert into public.registration_business_sectors
  (key, title, description, symbol, sort_order)
values
  (
    'construction_infrastructure',
    'Construction & Infrastructure',
    'Building, contracting, fabrication and infrastructure delivery.',
    '🏗️',
    10
  ),
  (
    'trading_distribution',
    'Trading & Distribution',
    'Manufacturing, supply, wholesale, retail and distribution.',
    '📦',
    20
  ),
  (
    'professional_services',
    'Professional Services',
    'Architecture, engineering, valuation, legal and advisory work.',
    '🧭',
    30
  ),
  (
    'equipment_logistics',
    'Equipment & Logistics',
    'Equipment, transport, fleets, rentals and storage.',
    '🚚',
    40
  ),
  (
    'property',
    'Property',
    'Ownership, development, brokerage and property consultancy.',
    '🏠',
    50
  ),
  (
    'finance',
    'Finance',
    'Banking, lending, insurance and financial guidance.',
    '₹',
    60
  ),
  (
    'manufacturing_industry',
    'Manufacturing & Industry',
    'Factories, workshops, processing and industrial enterprises.',
    '🏭',
    70
  ),
  (
    'agriculture',
    'Agriculture',
    'Farming, nursery, agricultural supply, storage and processing.',
    '🌾',
    80
  ),
  (
    'utilities',
    'Utilities',
    'Water, electricity, solar and telecom services.',
    '⚡',
    90
  ),
  (
    'media_digital',
    'Media & Digital',
    'Writing, publishing, digital agencies and software.',
    '💻',
    100
  ),
  (
    'others',
    'Others',
    'Institutions, cooperatives, startups and other organisations.',
    '🧩',
    110
  )
on conflict (key) do update
set
  title = excluded.title,
  description = excluded.description,
  symbol = excluded.symbol,
  sort_order = excluded.sort_order;


-- ============================================================
-- INDIVIDUAL SKILLED PROFESSIONS
--
-- Constitutional scope:
-- self-working tradespeople only.
--
-- Deliberately excluded:
-- Technician
-- Surveyor (Amin)
-- Architect
-- Civil / Structural Engineer
--
-- Those identities belong to Business / Professional
-- registration, as previously decided.
-- ============================================================

insert into public.identity_master as target (
  identity_key,
  label,
  family_key,
  lifecycle_stage,
  workspace_label,
  description,
  provider_forms,
  engagement_models,
  aliases,
  legacy_role,
  legacy_modules,
  requires_business_onboarding,
  requires_professional_verification,
  is_featured,
  is_active,
  sort_order,
  registration_scopes,
  lifetime_free_candidate,
  redirect_to_business
)
values
  (
    'mason',
    'Mason (Rajmistri)',
    'skilled_workforce',
    'execution',
    'Mason Workspace',
    'Self-working masonry professional.',
    array['individual'],
    array['direct_service'],
    array['rajmistri','mason'],
    'vendor',
    array['services'],
    false,
    true,
    true,
    true,
    10,
    array['individual_skill'],
    true,
    false
  ),
  (
    'carpenter',
    'Carpenter',
    'skilled_workforce',
    'finishing',
    'Carpenter Workspace',
    'Self-working carpenter.',
    array['individual'],
    array['direct_service'],
    array['carpenter'],
    'vendor',
    array['services'],
    false,
    true,
    true,
    true,
    20,
    array['individual_skill'],
    true,
    false
  ),
  (
    'painter',
    'Painter / Polisher',
    'skilled_workforce',
    'finishing',
    'Painter Workspace',
    'Self-working painter or polisher.',
    array['individual'],
    array['direct_service'],
    array['painter','polisher'],
    'vendor',
    array['services'],
    false,
    true,
    true,
    true,
    30,
    array['individual_skill'],
    true,
    false
  ),
  (
    'electrician',
    'Electrician',
    'skilled_workforce',
    'services',
    'Electrician Workspace',
    'Self-working electrician.',
    array['individual'],
    array['direct_service'],
    array['electrician'],
    'vendor',
    array['services'],
    false,
    true,
    true,
    true,
    40,
    array['individual_skill'],
    true,
    false
  ),
  (
    'plumber',
    'Plumber',
    'skilled_workforce',
    'services',
    'Plumber Workspace',
    'Self-working plumbing professional.',
    array['individual'],
    array['direct_service'],
    array['plumber'],
    'vendor',
    array['services'],
    false,
    true,
    true,
    true,
    50,
    array['individual_skill'],
    true,
    false
  ),
  (
    'welder',
    'Welder / Fabricator',
    'skilled_workforce',
    'execution',
    'Welder Workspace',
    'Self-working welding or fabrication professional.',
    array['individual'],
    array['direct_service'],
    array['welder','fabricator'],
    'vendor',
    array['services'],
    false,
    true,
    false,
    true,
    60,
    array['individual_skill'],
    true,
    false
  ),
  (
    'tile_worker',
    'Tile / Marble Installer',
    'skilled_workforce',
    'finishing',
    'Tile Worker Workspace',
    'Self-working tile or marble installer.',
    array['individual'],
    array['direct_service'],
    array['tile worker','marble installer'],
    'vendor',
    array['services'],
    false,
    true,
    false,
    true,
    70,
    array['individual_skill'],
    true,
    false
  ),
  (
    'bar_bender',
    'Bar Bender / Steel Fixer',
    'skilled_workforce',
    'structure',
    'Steel Fixer Workspace',
    'Self-working reinforcement cutting, bending and fixing professional.',
    array['individual'],
    array['direct_service'],
    array['bar bender','steel fixer'],
    'vendor',
    array['services'],
    false,
    true,
    false,
    true,
    80,
    array['individual_skill'],
    true,
    false
  ),
  (
    'shuttering_worker',
    'Shuttering Worker',
    'skilled_workforce',
    'structure',
    'Shuttering Worker Workspace',
    'Self-working shuttering or formwork professional.',
    array['individual'],
    array['direct_service'],
    array['shuttering worker','formwork worker'],
    'vendor',
    array['services'],
    false,
    true,
    false,
    true,
    90,
    array['individual_skill'],
    true,
    false
  ),
  (
    'machine_operator',
    'Construction Machine Operator',
    'skilled_workforce',
    'equipment',
    'Machine Operator Workspace',
    'Self-working construction machine operator.',
    array['individual'],
    array['direct_service'],
    array['machine operator'],
    'vendor',
    array['services','rentals'],
    false,
    true,
    false,
    true,
    100,
    array['individual_skill'],
    true,
    false
  ),
  (
    'equipment_operator',
    'Heavy Equipment Operator',
    'skilled_workforce',
    'equipment',
    'Equipment Operator Workspace',
    'Self-working heavy equipment operator.',
    array['individual'],
    array['direct_service'],
    array['equipment operator'],
    'vendor',
    array['services','rentals'],
    false,
    true,
    false,
    true,
    110,
    array['individual_skill'],
    true,
    false
  ),
  (
    'driver',
    'Driver',
    'skilled_workforce',
    'logistics',
    'Driver Workspace',
    'Self-working driver.',
    array['individual'],
    array['direct_service'],
    array['driver'],
    'vendor',
    array['services'],
    false,
    true,
    false,
    true,
    120,
    array['individual_skill'],
    true,
    false
  ),
  (
    'gardener',
    'Gardener / Landscaping Worker',
    'skilled_workforce',
    'external_works',
    'Gardener Workspace',
    'Self-working gardener or landscaping worker.',
    array['individual'],
    array['direct_service'],
    array['gardener','landscaping worker'],
    'vendor',
    array['services'],
    false,
    true,
    false,
    true,
    130,
    array['individual_skill'],
    true,
    false
  ),
  (
    'helper',
    'Skilled Helper',
    'skilled_workforce',
    'execution',
    'Skilled Helper Workspace',
    'Self-working skilled helper.',
    array['individual'],
    array['direct_service'],
    array['skilled helper'],
    'vendor',
    array['services'],
    false,
    true,
    false,
    true,
    140,
    array['individual_skill'],
    true,
    false
  ),
  (
    'repair_professional',
    'Repair Professional',
    'skilled_workforce',
    'maintenance',
    'Repair Professional Workspace',
    'Self-working repair and maintenance professional.',
    array['individual'],
    array['direct_service'],
    array['repair worker','repair professional'],
    'vendor',
    array['services'],
    false,
    true,
    false,
    true,
    150,
    array['individual_skill'],
    true,
    false
  ),
  (
    'skilled_professional',
    'Other Skilled Professional',
    'skilled_workforce',
    'execution',
    'Skilled Professional Workspace',
    'Other self-working skilled profession approved for the individual pathway.',
    array['individual'],
    array['direct_service'],
    array['skilled professional'],
    'vendor',
    array['services'],
    false,
    true,
    false,
    true,
    160,
    array['individual_skill'],
    true,
    false
  )
on conflict (identity_key) do update
set
  registration_scopes =
    (
      select coalesce(
        array_agg(distinct value),
        '{}'::text[]
      )
      from unnest(
        coalesce(target.registration_scopes, '{}'::text[])
        ||
        excluded.registration_scopes
      ) as value
    ),
  lifetime_free_candidate = true,
  redirect_to_business = false;


-- ============================================================
-- HIGH-VALUE / PROFESSIONAL / BUSINESS PERSONAL ROLES
-- These MUST NOT enter the lifetime-free skilled-worker route.
-- ============================================================

update public.identity_master
set
  registration_scopes =
    (
      select coalesce(
        array_agg(distinct value),
        '{}'::text[]
      )
      from unnest(
        coalesce(registration_scopes, '{}'::text[])
        ||
        array['business_personal_role']
      ) as value
    ),
  lifetime_free_candidate = false,
  redirect_to_business = true,
  requires_business_onboarding = true
where identity_key in (
  'vendor_hub',
  'builder',
  'contractor',
  'property_owner',
  'equipment_owner',
  'technician',
  'architect',
  'civil_engineer',
  'structural_engineer',
  'surveyor',
  'valuer',
  'banker',
  'financial_consultant',
  'accountant',
  'chartered_accountant',
  'advocate',
  'consultant',
  'project_management_consultant',
  'writer_author',
  'farmer',
  'transport_operator',
  'other_individual_professional'
);


-- ============================================================
-- BUSINESS IDENTITIES
-- Existing identity_master remains canonical.
-- ============================================================

update public.identity_master
set
  registration_scopes =
    (
      select coalesce(
        array_agg(distinct value),
        '{}'::text[]
      )
      from unnest(
        coalesce(registration_scopes, '{}'::text[])
        ||
        array['business_identity']
      ) as value
    ),
  lifetime_free_candidate = false,
  redirect_to_business = true,
  requires_business_onboarding = true
where identity_key in (
  'manufacturer',
  'builder_developer',
  'civil_contractor',
  'epc_contractor',
  'interior_contractor',
  'fabricator',
  'infrastructure_company',

  'wholesaler',
  'distributor',
  'dealer',
  'retailer',
  'supplier',
  'importer',
  'exporter',
  'stockist',

  'technician',
  'architect',
  'structural_engineer',
  'civil_engineer',
  'surveyor',
  'valuer',
  'consultant',
  'chartered_accountant',
  'advocate',
  'project_management_consultant',

  'equipment_owner',
  'equipment_rental_company',
  'transport_company',
  'fleet_owner',
  'warehouse_operator',

  'property_owner',
  'real_estate_broker',
  'property_consultant',

  'bank',
  'nbfc',
  'housing_finance_company',
  'insurance_company',
  'financial_consultant',

  'factory',
  'processing_unit',
  'workshop',
  'msme_unit',
  'industrial_enterprise',

  'farmer',
  'nursery',
  'agri_supplier',
  'cold_storage',
  'food_processing',

  'water_supplier',
  'electricity_contractor',
  'solar_company',
  'telecom_contractor',

  'blogger',
  'writer',
  'publisher',
  'digital_agency',
  'software_company',

  'ngo_trust',
  'educational_institution',
  'government_organisation',
  'cooperative_society',
  'startup'
);



-- ============================================================
-- CRS-4 BUSINESS IDENTITY ↔ SECTOR SEED
--
-- Former React registration classifications now live here.
-- identity_master remains the single canonical identity source.
--
-- A canonical identity may legitimately appear in multiple
-- sectors without being duplicated.
-- ============================================================

insert into public.registration_identity_sector_map (
  identity_key,
  sector_key,
  nature_modules,
  sort_order,
  is_active
)
select
  seed.identity_key,
  seed.sector_key,
  seed.nature_modules,
  seed.sort_order,
  true
from (
  values
    -- Construction & Infrastructure
    ('manufacturer', 'construction_infrastructure', array['materials']::text[], 10),
    ('builder_developer', 'construction_infrastructure', array['property','services']::text[], 20),
    ('civil_contractor', 'construction_infrastructure', array['services']::text[], 30),
    ('epc_contractor', 'construction_infrastructure', array['services']::text[], 40),
    ('interior_contractor', 'construction_infrastructure', array['services']::text[], 50),
    ('fabricator', 'construction_infrastructure', array['materials','services']::text[], 60),
    ('infrastructure_company', 'construction_infrastructure', array['services']::text[], 70),

    -- Trading & Distribution
    ('manufacturer', 'trading_distribution', array['materials']::text[], 10),
    ('wholesaler', 'trading_distribution', array['materials']::text[], 20),
    ('distributor', 'trading_distribution', array['materials']::text[], 30),
    ('dealer', 'trading_distribution', array['materials']::text[], 40),
    ('retailer', 'trading_distribution', array['materials']::text[], 50),
    ('supplier', 'trading_distribution', array['materials']::text[], 60),
    ('importer', 'trading_distribution', array['materials']::text[], 70),
    ('exporter', 'trading_distribution', array['materials']::text[], 80),
    ('stockist', 'trading_distribution', array['materials']::text[], 90),

    -- Professional Services
    ('technician', 'professional_services', array['services']::text[], 5),
    ('architect', 'professional_services', array['services']::text[], 10),
    ('structural_engineer', 'professional_services', array['services']::text[], 20),
    ('civil_engineer', 'professional_services', array['services']::text[], 30),
    ('surveyor', 'professional_services', array['services']::text[], 40),
    ('valuer', 'professional_services', array['services']::text[], 50),
    ('consultant', 'professional_services', array['services']::text[], 60),
    ('chartered_accountant', 'professional_services', array['services']::text[], 70),
    ('advocate', 'professional_services', array['services']::text[], 80),
    ('project_management_consultant', 'professional_services', array['services']::text[], 90),

    -- Equipment & Logistics
    ('equipment_owner', 'equipment_logistics', array['rentals']::text[], 10),
    ('equipment_rental_company', 'equipment_logistics', array['rentals']::text[], 20),
    ('transport_company', 'equipment_logistics', array['services','rentals']::text[], 30),
    ('fleet_owner', 'equipment_logistics', array['rentals']::text[], 40),
    ('warehouse_operator', 'equipment_logistics', array['services','rentals']::text[], 50),

    -- Property
    ('property_owner', 'property', array['property']::text[], 10),
    ('builder_developer', 'property', array['property','services']::text[], 20),
    ('real_estate_broker', 'property', array['property']::text[], 30),
    ('property_consultant', 'property', array['property','services']::text[], 40),

    -- Finance
    ('bank', 'finance', array['services']::text[], 10),
    ('nbfc', 'finance', array['services']::text[], 20),
    ('housing_finance_company', 'finance', array['services']::text[], 30),
    ('insurance_company', 'finance', array['services']::text[], 40),
    ('financial_consultant', 'finance', array['services']::text[], 50),

    -- Manufacturing & Industry
    ('factory', 'manufacturing_industry', array['materials']::text[], 10),
    ('processing_unit', 'manufacturing_industry', array['materials']::text[], 20),
    ('workshop', 'manufacturing_industry', array['materials','services']::text[], 30),
    ('msme_unit', 'manufacturing_industry', array['materials','services']::text[], 40),
    ('industrial_enterprise', 'manufacturing_industry', array['materials','services']::text[], 50),

    -- Agriculture
    ('farmer', 'agriculture', array['materials']::text[], 10),
    ('nursery', 'agriculture', array['materials']::text[], 20),
    ('agri_supplier', 'agriculture', array['materials']::text[], 30),
    ('cold_storage', 'agriculture', array['services','rentals']::text[], 40),
    ('food_processing', 'agriculture', array['materials']::text[], 50),

    -- Utilities
    ('water_supplier', 'utilities', array['materials','services']::text[], 10),
    ('electricity_contractor', 'utilities', array['services']::text[], 20),
    ('solar_company', 'utilities', array['materials','services']::text[], 30),
    ('telecom_contractor', 'utilities', array['services']::text[], 40),

    -- Media & Digital
    ('blogger', 'media_digital', array['blog']::text[], 10),
    ('writer', 'media_digital', array['blog']::text[], 20),
    ('publisher', 'media_digital', array['blog']::text[], 30),
    ('digital_agency', 'media_digital', array['services','blog']::text[], 40),
    ('software_company', 'media_digital', array['services']::text[], 50),

    -- Others
    ('ngo_trust', 'others', array['services']::text[], 10),
    ('educational_institution', 'others', array['services']::text[], 20),
    ('government_organisation', 'others', array['services']::text[], 30),
    ('cooperative_society', 'others', array['services']::text[], 40),
    ('startup', 'others', array['services']::text[], 50)
) as seed(
  identity_key,
  sector_key,
  nature_modules,
  sort_order
)
join public.identity_master identity_row
  on identity_row.identity_key = seed.identity_key
join public.registration_business_sectors sector_row
  on sector_row.key = seed.sector_key
on conflict (identity_key, sector_key) do update
set
  nature_modules = excluded.nature_modules,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ============================================================
-- RLS
-- ============================================================

alter table public.registration_legal_constitutions
  enable row level security;

alter table public.registration_business_sectors
  enable row level security;

alter table public.registration_identity_sector_map
  enable row level security;

grant select
on public.registration_legal_constitutions,
   public.registration_business_sectors,
   public.registration_identity_sector_map
to authenticated;

grant insert, update, delete
on public.registration_legal_constitutions,
   public.registration_business_sectors,
   public.registration_identity_sector_map
to authenticated;


drop policy if exists
  "Authenticated members read active legal constitutions"
on public.registration_legal_constitutions;

create policy
  "Authenticated members read active legal constitutions"
on public.registration_legal_constitutions
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
  "Master admin manages legal constitutions"
on public.registration_legal_constitutions;

create policy
  "Master admin manages legal constitutions"
on public.registration_legal_constitutions
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
  "Authenticated members read active business sectors"
on public.registration_business_sectors;

create policy
  "Authenticated members read active business sectors"
on public.registration_business_sectors
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
  "Master admin manages business sectors"
on public.registration_business_sectors;

create policy
  "Master admin manages business sectors"
on public.registration_business_sectors
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
  "Authenticated members read active identity sector mappings"
on public.registration_identity_sector_map;

create policy
  "Authenticated members read active identity sector mappings"
on public.registration_identity_sector_map
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
  "Master admin manages identity sector mappings"
on public.registration_identity_sector_map;

create policy
  "Master admin manages identity sector mappings"
on public.registration_identity_sector_map
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


-- ============================================================
-- CRS-4A
-- CONSTITUTIONAL REGISTRATION REDIRECT MASTER
--
-- Registration-routing behaviour belongs to master data.
-- React must consume these rules rather than encode them.
-- ============================================================

create table if not exists public.registration_redirect_rules (
  id bigint generated by default as identity primary key,

  trigger_key text not null unique,
  display_text text not null,
  description text,

  target_registration_path text not null,

  redirect_after_selection boolean not null default true,

  business_reason text,

  target_business_identity_key text
    references public.identity_master(identity_key)
    on update cascade
    on delete restrict,

  sort_order integer not null default 1000,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.registration_redirect_rules is
  'Canonical master-data rules controlling registration redirection and optional Business Identity preselection.';


-- ============================================================
-- REDIRECT RULE INDEXES
-- ============================================================

create index if not exists
  registration_redirect_rules_active_sort_idx
on public.registration_redirect_rules (
  is_active,
  sort_order
);

create index if not exists
  registration_redirect_rules_target_path_idx
on public.registration_redirect_rules (
  target_registration_path
);

create index if not exists
  registration_redirect_rules_business_identity_idx
on public.registration_redirect_rules (
  target_business_identity_key
)
where target_business_identity_key is not null;


-- ============================================================
-- CONSTITUTIONAL REDIRECT RULE SEED
-- ============================================================

insert into public.registration_redirect_rules (
  trigger_key,
  display_text,
  description,
  target_registration_path,
  redirect_after_selection,
  business_reason,
  target_business_identity_key,
  sort_order,
  is_active
)
values
  (
    'takes_complete_contracts',
    'Takes complete contracts',
    'The person accepts responsibility for complete construction or service contracts rather than only personally performing a trade.',
    '/onboarding/business?registration=1',
    true,
    'Complete-contract activity is a business operating model.',
    'civil_contractor',
    10,
    true
  ),
  (
    'supplies_workers',
    'Supplies workers',
    'The person regularly supplies or deploys workers or organised work teams.',
    '/onboarding/business?registration=1',
    true,
    'Supplying workers is business activity rather than an individual self-working trade.',
    'contractor',
    20,
    true
  ),
  (
    'labour_contractor',
    'Labour contractor',
    'The person operates as a labour contractor.',
    '/onboarding/business?registration=1',
    true,
    'Labour contracting belongs to Business Registration.',
    'contractor',
    30,
    true
  ),
  (
    'team_manager',
    'Team manager',
    'The person primarily manages, supervises or deploys a team rather than personally performing the declared trade.',
    '/onboarding/business?registration=1',
    true,
    'Managing organised work teams is a business operating model.',
    'contractor',
    40,
    true
  ),
  (
    'construction_company',
    'Construction company',
    'The activity operates as a construction company or organised construction enterprise.',
    '/onboarding/business?registration=1',
    true,
    'Construction companies belong to the Business / Organisation pathway.',
    'infrastructure_company',
    50,
    true
  ),
  (
    'service_company',
    'Service company',
    'The activity operates as an organised service company, agency or service enterprise.',
    '/onboarding/business?registration=1',
    true,
    'Service companies belong to the Business / Organisation pathway.',
    'contractor',
    60,
    true
  )
on conflict (trigger_key) do update
set
  display_text = excluded.display_text,
  description = excluded.description,
  target_registration_path = excluded.target_registration_path,
  redirect_after_selection = excluded.redirect_after_selection,
  business_reason = excluded.business_reason,
  target_business_identity_key =
    excluded.target_business_identity_key,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;


-- ============================================================
-- REDIRECT RULE RLS
-- ============================================================

alter table public.registration_redirect_rules
  enable row level security;


drop policy if exists
  "Authenticated members read active redirect rules"
on public.registration_redirect_rules;

create policy
  "Authenticated members read active redirect rules"
on public.registration_redirect_rules
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
  "Master admin manages redirect rules"
on public.registration_redirect_rules;

create policy
  "Master admin manages redirect rules"
on public.registration_redirect_rules
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
