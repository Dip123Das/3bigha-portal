/**
 * Project NEEV — 3BOS Human Identity Engine
 *
 * Human identities are independent of:
 * - authentication roles;
 * - legacy vendor module grants;
 * - Growth Plans;
 * - administrative permissions.
 */

export type IdentityFamilyKey =
  | "customer"
  | "property_real_estate"
  | "construction"
  | "materials_supply"
  | "equipment_rental"
  | "professional"
  | "legal_compliance"
  | "finance_investment"
  | "skilled_workforce"
  | "logistics"
  | "agriculture_rural"
  | "government_public"
  | "knowledge_media";

export type IdentityLifecycleStatus =
  | "production"
  | "partial"
  | "foundation"
  | "future";

export type HumanIdentityKey =
  | "customer"
  | "property_owner"
  | "land_owner"
  | "builder"
  | "real_estate_developer"
  | "real_estate_consultant"
  | "broker"
  | "housing_society"
  | "construction_business"
  | "contractor"
  | "civil_contractor"
  | "electrical_contractor"
  | "plumbing_contractor"
  | "interior_contractor"
  | "road_contractor"
  | "infrastructure_contractor"
  | "material_business"
  | "manufacturer"
  | "dealer"
  | "distributor"
  | "wholesaler"
  | "retail_business"
  | "rental_business"
  | "equipment_owner"
  | "machine_operator"
  | "professional"
  | "architect"
  | "engineer"
  | "structural_engineer"
  | "surveyor"
  | "interior_designer"
  | "landscape_designer"
  | "project_management_consultant"
  | "valuation_professional"
  | "environmental_consultant"
  | "lawyer"
  | "chartered_accountant"
  | "company_secretary"
  | "tax_consultant"
  | "gst_consultant"
  | "banker"
  | "financial_institution"
  | "lender"
  | "loan_consultant"
  | "investor"
  | "insurance_advisor"
  | "skilled_workforce"
  | "mason"
  | "carpenter"
  | "electrician"
  | "plumber"
  | "painter"
  | "fabricator"
  | "welder"
  | "tile_installer"
  | "steel_fixer"
  | "bar_bender"
  | "supervisor"
  | "transport_business"
  | "fleet_owner"
  | "crane_service"
  | "delivery_partner"
  | "farmer"
  | "agriculture_business"
  | "nursery"
  | "irrigation_specialist"
  | "government_department"
  | "municipality"
  | "panchayat"
  | "development_authority"
  | "public_sector_undertaking"
  | "author"
  | "trainer"
  | "researcher"
  | "institution"
  | "knowledge_creator";

export type HumanIdentityDefinition = {
  key: HumanIdentityKey;
  family: IdentityFamilyKey;
  label: string;
  workspaceLabel: string;
  description: string;
  status: IdentityLifecycleStatus;

  /**
   * Optional parent identity used for progressive selection.
   * Example: Mason belongs beneath Skilled Workforce.
   */
  parent?: HumanIdentityKey;

  /**
   * Existing internal values that may suggest this identity.
   * These are compatibility inputs, never final authority.
   */
  legacyRoles?: string[];
  legacyModules?: string[];
  legacyBusinessActivities?: string[];
  legacyPurposes?: string[];
};
