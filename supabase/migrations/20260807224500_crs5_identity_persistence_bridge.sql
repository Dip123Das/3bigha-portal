begin;

-- ============================================================
-- CRS-5C1
-- CANONICAL IDENTITY PERSISTENCE BRIDGE
--
-- business_profiles.nature_of_business remains the existing
-- module/capability compatibility field.
--
-- Canonical registration identities are stored separately.
-- No existing data is reinterpreted or overwritten.
-- ============================================================

alter table public.business_profiles
  add column if not exists business_identities text[]
    not null default '{}'::text[],

  add column if not exists individual_identities text[]
    not null default '{}'::text[];

comment on column public.business_profiles.business_identities is
  'Canonical business identity keys selected from identity_master during Business Registration.';

comment on column public.business_profiles.individual_identities is
  'Canonical personal-role or individual identity keys selected from identity_master.';

create index if not exists
  business_profiles_business_identities_idx
on public.business_profiles
using gin(business_identities);

create index if not exists
  business_profiles_individual_identities_idx
on public.business_profiles
using gin(individual_identities);

-- Deliberately no backfill from nature_of_business.
-- Existing values such as materials/services/rentals/property/blog
-- are capability modules, not identity_master keys.

commit;
