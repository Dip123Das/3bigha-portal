begin;

-- ============================================================
-- CRS Business Identity Catalogue Restoration
--
-- Restore existing organization-capable identities to Business
-- Registration and provide at least one valid organizational
-- identity for every active Business Sector.
--
-- Individual skilled-worker identities remain unchanged.
-- Existing scopes and sector mappings remain preserved.
-- ============================================================


-- ============================================================
-- 1. RESTORE BUSINESS SCOPE TO EXISTING ORGANIZATION-CAPABLE
--    IDENTITY FAMILIES
-- ============================================================

update public.identity_master
set
  registration_scopes = case
    when registration_scopes
      @> array['business_identity']::text[]
    then registration_scopes
    else array_append(
      registration_scopes,
      'business_identity'
    )
  end,
  updated_at = now()
where is_active is true
  and requires_business_onboarding is true
  and family_key in (
    'construction',
    'equipment_rental',
    'legal_compliance',
    'logistics',
    'materials_supply',
    'professional',
    'property_real_estate'
  );


-- ============================================================
-- 2. ADD ONLY THE FIVE MISSING ORGANIZATIONAL IDENTITIES
-- ============================================================

insert into public.identity_master (
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
    'financial_services_organisation',
    'Financial Services / Lending Organisation',
    'finance',
    'operations',
    'Financial Services Workspace',
    'An authorised organisation providing lending, insurance, banking support or other financial services.',
    array[
      'proprietorship',
      'partnership',
      'llp',
      'private_limited',
      'public_limited',
      'cooperative',
      'government'
    ]::text[],
    array[
      'direct_service',
      'consultancy',
      'institutional_service'
    ]::text[],
    array[
      'bank',
      'lender',
      'insurance provider',
      'financial institution'
    ]::text[],
    'vendor',
    array['services']::text[],
    true,
    true,
    false,
    true,
    800,
    array['business_identity']::text[],
    false,
    false
  ),
  (
    'agriculture_agribusiness',
    'Agriculture / Agri-business',
    'agriculture',
    'operations',
    'Agri-business Workspace',
    'A farm, nursery, agricultural supplier, producer or organised agriculture-related business.',
    array[
      'individual',
      'proprietorship',
      'partnership',
      'cooperative',
      'firm',
      'company'
    ]::text[],
    array[
      'direct_service',
      'supply',
      'production',
      'contract'
    ]::text[],
    array[
      'farmer',
      'nursery',
      'agricultural supplier',
      'agri enterprise'
    ]::text[],
    'vendor',
    array['materials','services']::text[],
    true,
    false,
    false,
    true,
    810,
    array['business_identity']::text[],
    false,
    false
  ),
  (
    'utility_service_provider',
    'Utility Service Provider',
    'utilities',
    'operations',
    'Utilities Workspace',
    'An organisation providing electricity, water, solar, telecommunications or related utility services.',
    array[
      'proprietorship',
      'partnership',
      'firm',
      'company',
      'government',
      'cooperative'
    ]::text[],
    array[
      'direct_service',
      'contract',
      'institutional_service'
    ]::text[],
    array[
      'electricity provider',
      'water provider',
      'solar utility',
      'telecom provider'
    ]::text[],
    'vendor',
    array['services']::text[],
    true,
    true,
    false,
    true,
    820,
    array['business_identity']::text[],
    false,
    false
  ),
  (
    'media_digital_business',
    'Media / Digital Business',
    'media_digital',
    'operations',
    'Media & Digital Workspace',
    'A media, publishing, advertising, digital services or software organisation.',
    array[
      'individual',
      'proprietorship',
      'partnership',
      'firm',
      'agency',
      'company'
    ]::text[],
    array[
      'direct_service',
      'publishing',
      'advertising',
      'contract'
    ]::text[],
    array[
      'publisher',
      'digital agency',
      'advertising agency',
      'software company'
    ]::text[],
    'vendor',
    array['services','blog']::text[],
    true,
    false,
    false,
    true,
    830,
    array['business_identity']::text[],
    false,
    false
  ),
  (
    'other_business_organisation',
    'Other Business / Organisation',
    'general_business',
    'operations',
    'Business Workspace',
    'An organisation whose principal activity is not yet represented by another Business Identity.',
    array[
      'individual',
      'proprietorship',
      'partnership',
      'llp',
      'firm',
      'company',
      'society',
      'trust',
      'cooperative',
      'government'
    ]::text[],
    array[
      'direct_service',
      'supply',
      'contract'
    ]::text[],
    array[
      'other business',
      'institution',
      'startup',
      'organisation'
    ]::text[],
    'vendor',
    array['services']::text[],
    true,
    false,
    false,
    true,
    840,
    array['business_identity']::text[],
    false,
    false
  )
on conflict (identity_key) do nothing;


-- ============================================================
-- 3. MAP EXISTING CATALOGUE IDENTITIES TO THEIR PRIMARY SECTOR
--
-- Existing mappings remain untouched. The nature modules below
-- are compatibility projections for current marketplaces.
-- ============================================================

insert into public.registration_identity_sector_map (
  identity_key,
  sector_key,
  nature_modules,
  sort_order,
  is_active
)
select
  identity.identity_key,

  case
    when identity.family_key = 'construction'
      then 'construction_infrastructure'

    when identity.family_key in (
      'professional',
      'legal_compliance'
    )
      then 'professional_services'

    when identity.family_key in (
      'equipment_rental',
      'logistics'
    )
      then 'equipment_logistics'

    when identity.identity_key =
      'building_material_supplier'
      then 'trading_distribution'

    when identity.identity_key =
      'material_manufacturer'
      then 'manufacturing_industry'

    when identity.family_key =
      'property_real_estate'
      then 'property'
  end as sector_key,

  case
    when identity.family_key = 'construction'
      then array['services']::text[]

    when identity.family_key in (
      'professional',
      'legal_compliance'
    )
      then array['services']::text[]

    when identity.family_key = 'equipment_rental'
      then array['rentals']::text[]

    when identity.family_key = 'logistics'
      then array['services']::text[]

    when identity.identity_key =
      'building_material_supplier'
      then array['materials']::text[]

    when identity.identity_key =
      'material_manufacturer'
      then array['materials']::text[]

    when identity.identity_key =
      'real_estate_developer'
      then array['property','services']::text[]

    when identity.identity_key =
      'property_broker'
      then array['property','services']::text[]

    when identity.identity_key =
      'property_owner'
      then array['property']::text[]
  end as nature_modules,

  identity.sort_order,
  true
from public.identity_master as identity
where identity.is_active is true
  and identity.registration_scopes
    @> array['business_identity']::text[]
  and (
    identity.family_key in (
      'construction',
      'professional',
      'legal_compliance',
      'equipment_rental',
      'logistics',
      'property_real_estate'
    )
    or identity.identity_key in (
      'building_material_supplier',
      'material_manufacturer'
    )
  )
on conflict (identity_key, sector_key) do nothing;


-- ============================================================
-- 4. MAP THE FIVE NEW ORGANIZATIONAL IDENTITIES
-- ============================================================

insert into public.registration_identity_sector_map (
  identity_key,
  sector_key,
  nature_modules,
  sort_order,
  is_active
)
values
  (
    'financial_services_organisation',
    'finance',
    array['services']::text[],
    10,
    true
  ),
  (
    'agriculture_agribusiness',
    'agriculture',
    array['materials','services']::text[],
    10,
    true
  ),
  (
    'utility_service_provider',
    'utilities',
    array['services']::text[],
    10,
    true
  ),
  (
    'media_digital_business',
    'media_digital',
    array['services','blog']::text[],
    10,
    true
  ),
  (
    'other_business_organisation',
    'others',
    array['services']::text[],
    10,
    true
  )
on conflict (identity_key, sector_key) do nothing;


-- ============================================================
-- 5. ASSERT THAT EVERY ACTIVE SECTOR NOW HAS AN ACTIVE,
--    REGISTRATION-ELIGIBLE BUSINESS IDENTITY
-- ============================================================

do $$
declare
  empty_sector_count integer;
begin
  select count(*)
  into empty_sector_count
  from public.registration_business_sectors as sector
  where sector.is_active is true
    and not exists (
      select 1
      from public.registration_identity_sector_map as mapping
      join public.identity_master as identity
        on identity.identity_key = mapping.identity_key
      where mapping.sector_key = sector.key
        and mapping.is_active is true
        and identity.is_active is true
        and identity.registration_scopes
          @> array['business_identity']::text[]
    );

  if empty_sector_count > 0 then
    raise exception
      'Business Identity restoration failed: % active sectors remain empty',
      empty_sector_count;
  end if;
end
$$;

commit;
