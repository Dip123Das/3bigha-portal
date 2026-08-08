begin;

-- ============================================================
-- CRS-5A
-- CANONICAL IDENTITY PROJECTION CONTRACT
--
-- identity_master remains the only identity catalogue.
-- These fields describe how an identity projects into the
-- existing 3BOS runtime.
-- ============================================================

alter table public.identity_master
  add column if not exists dashboard_path text
    not null default '/dashboard/workspace',

  add column if not exists unified_workspace_path text
    not null default '/dashboard/workspace',

  add column if not exists navigation_modules text[]
    not null default '{}'::text[],

  add column if not exists marketplace_modules text[]
    not null default '{}'::text[],

  add column if not exists rfq_modules text[]
    not null default '{}'::text[],

  add column if not exists verification_requirements text[]
    not null default '{}'::text[],

  add column if not exists activation_requirements text[]
    not null default '{}'::text[],

  add column if not exists subscription_policy_key text
    not null default 'standard',

  add column if not exists activation_policy_key text
    not null default 'standard_verified';

comment on column public.identity_master.dashboard_path is
  'Canonical default dashboard projected for this identity.';

comment on column public.identity_master.unified_workspace_path is
  'Canonical unified workspace entry projected for this identity.';

comment on column public.identity_master.navigation_modules is
  'Navigation capability keys projected from this identity.';

comment on column public.identity_master.marketplace_modules is
  'Marketplace modules in which this identity may operate.';

comment on column public.identity_master.rfq_modules is
  'RFQ modules in which this identity may participate.';

comment on column public.identity_master.verification_requirements is
  'Canonical evidence requirements such as selfie, location, workplace, document, professional_review.';

comment on column public.identity_master.activation_requirements is
  'Canonical requirements that must be satisfied before activation.';

comment on column public.identity_master.subscription_policy_key is
  'Subscription policy resolved for this identity.';

comment on column public.identity_master.activation_policy_key is
  'Dashboard/workspace activation policy resolved for this identity.';


-- ============================================================
-- PRESERVE CURRENT 3BOS BEHAVIOUR AS INITIAL MASTER DATA
--
-- legacy_modules already expresses the existing authorised
-- module meaning. CRS-5 adopts that meaning into the new
-- projection contract instead of inventing another mapping.
-- ============================================================

update public.identity_master
set
  navigation_modules =
    case
      when cardinality(navigation_modules) = 0
        then coalesce(legacy_modules, '{}'::text[])
      else navigation_modules
    end,

  marketplace_modules =
    case
      when cardinality(marketplace_modules) = 0
        then coalesce(legacy_modules, '{}'::text[])
      else marketplace_modules
    end,

  rfq_modules =
    case
      when cardinality(rfq_modules) = 0
        then coalesce(legacy_modules, '{}'::text[])
      else rfq_modules
    end,

  verification_requirements =
    case
      when cardinality(verification_requirements) > 0
        then verification_requirements

      when 'individual_skill' = any(
        coalesce(registration_scopes, '{}'::text[])
      )
        then array[
          'original_identity',
          'live_selfie',
          'live_work_evidence',
          'exact_location',
          'human_review'
        ]::text[]

      when requires_professional_verification = true
        then array[
          'business_identity',
          'document_evidence',
          'live_selfie',
          'exact_location',
          'professional_review'
        ]::text[]

      when requires_business_onboarding = true
        then array[
          'business_identity',
          'document_evidence',
          'live_selfie',
          'exact_location'
        ]::text[]

      else array[
        'basic_identity'
      ]::text[]
    end,

  activation_requirements =
    case
      when cardinality(activation_requirements) > 0
        then activation_requirements

      when 'individual_skill' = any(
        coalesce(registration_scopes, '{}'::text[])
      )
        then array[
          'registration_complete',
          'identity_verified',
          'selfie_verified',
          'work_evidence_verified',
          'location_verified',
          'human_approval'
        ]::text[]

      when requires_business_onboarding = true
        then array[
          'registration_complete',
          'business_verified',
          'location_verified'
        ]::text[]

      else array[
        'registration_complete'
      ]::text[]
    end;


-- ============================================================
-- SPECIAL CURRENT DASHBOARD PROJECTIONS
-- Preserve current production routing before CRS-5B begins.
-- ============================================================

update public.identity_master
set dashboard_path = '/dashboard/banker'
where legacy_role in ('banker', 'finance_banker');

update public.identity_master
set dashboard_path = '/admin/dashboard'
where legacy_role = 'master_admin';

update public.identity_master
set unified_workspace_path = '/dashboard/workspace'
where unified_workspace_path is null
   or btrim(unified_workspace_path) = '';


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists
  identity_master_navigation_modules_idx
on public.identity_master
using gin(navigation_modules);

create index if not exists
  identity_master_marketplace_modules_idx
on public.identity_master
using gin(marketplace_modules);

create index if not exists
  identity_master_rfq_modules_idx
on public.identity_master
using gin(rfq_modules);

create index if not exists
  identity_master_verification_requirements_idx
on public.identity_master
using gin(verification_requirements);


commit;
