import { HUMAN_IDENTITY_FAMILIES, HUMAN_IDENTITY_REGISTRY } from "./registry";
import type { HumanIdentityKey, IdentityFamilyKey } from "./types";

export type LegacyPortalRole =
  | "buyer"
  | "vendor"
  | "builder"
  | "hub_vendor"
  | "blogger"
  | "banker"
  | "investor";

export type LegacyModuleKey =
  | "materials"
  | "services"
  | "rentals"
  | "property_owner"
  | "property_builder"
  | "blog_author"
  | "investor";

export type IdentityDeclarationBridge = {
  role: LegacyPortalRole;
  modules: LegacyModuleKey[];
  portalUseReason: string;
  requiresBusinessOnboarding: boolean;
  requiresProfessionalVerification: boolean;
};

export const DECLARABLE_IDENTITY_FAMILIES: IdentityFamilyKey[] = [
  "customer",
  "property_real_estate",
  "construction",
  "materials_supply",
  "equipment_rental",
  "professional",
  "skilled_workforce",
  "logistics",
  "finance_investment",
  "legal_compliance",
  "knowledge_media",
  "agriculture_rural",
  "government_public",
];

export const DECLARABLE_IDENTITIES: HumanIdentityKey[] = [
  "customer",
  "property_seeker",
  "tenant",
  "property_owner",
  "property_lessor",
  "land_owner",
  "real_estate_developer",
  "real_estate_consultant",
  "broker",
  "housing_society",
  "construction_business",
  "contractor",
  "civil_contractor",
  "electrical_contractor",
  "plumbing_contractor",
  "interior_contractor",
  "road_contractor",
  "infrastructure_contractor",
  "material_business",
  "manufacturer",
  "dealer",
  "distributor",
  "wholesaler",
  "retail_business",
  "rental_business",
  "equipment_owner",
  "machine_operator",
  "professional",
  "architect",
  "engineer",
  "structural_engineer",
  "surveyor",
  "interior_designer",
  "landscape_designer",
  "project_management_consultant",
  "valuation_professional",
  "registered_valuer",
  "environmental_consultant",
  "lawyer",
  "chartered_accountant",
  "company_secretary",
  "tax_consultant",
  "gst_consultant",
  "banker",
  "financial_institution",
  "lender",
  "loan_consultant",
  "investor",
  "insurance_advisor",
  "skilled_workforce",
  "mason",
  "carpenter",
  "electrician",
  "plumber",
  "painter",
  "fabricator",
  "welder",
  "tile_installer",
  "steel_fixer",
  "bar_bender",
  "supervisor",
  "construction_support_worker",
  "transport_business",
  "fleet_owner",
  "crane_service",
  "delivery_partner",
  "farmer",
  "agriculture_business",
  "nursery",
  "irrigation_specialist",
  "government_department",
  "municipality",
  "panchayat",
  "development_authority",
  "public_sector_undertaking",
  "author",
  "trainer",
  "researcher",
  "institution",
  "knowledge_creator",
  "multi_business_operator",
];

const SERVICE_IDENTITIES = new Set<HumanIdentityKey>([
  "construction_business", "contractor", "civil_contractor",
  "electrical_contractor", "plumbing_contractor", "interior_contractor",
  "road_contractor", "infrastructure_contractor", "professional", "architect",
  "engineer", "structural_engineer", "surveyor", "interior_designer",
  "landscape_designer", "project_management_consultant", "valuation_professional", "registered_valuer",
  "environmental_consultant", "lawyer", "chartered_accountant",
  "company_secretary", "tax_consultant", "gst_consultant", "loan_consultant",
  "insurance_advisor", "skilled_workforce", "mason", "carpenter", "electrician",
  "plumber", "painter", "fabricator", "welder", "tile_installer", "steel_fixer",
  "bar_bender", "supervisor", "construction_support_worker", "machine_operator", "transport_business",
  "fleet_owner", "crane_service", "delivery_partner", "irrigation_specialist",
]);

const REGULATED_IDENTITIES = new Set<HumanIdentityKey>([
  "architect", "engineer", "structural_engineer", "surveyor",
  "valuation_professional", "registered_valuer", "lawyer", "chartered_accountant", "company_secretary",
  "banker", "financial_institution", "lender",
]);

export function getIdentityDeclarationBridge(
  identityKey: HumanIdentityKey
): IdentityDeclarationBridge {
  if (["customer", "property_seeker", "tenant"].includes(identityKey)) {
    return { role: "buyer", modules: [], portalUseReason: "buy_property_or_materials", requiresBusinessOnboarding: false, requiresProfessionalVerification: false };
  }
  if (identityKey === "real_estate_developer") {
    return { role: "builder", modules: ["property_builder"], portalUseReason: "manage_builder_projects", requiresBusinessOnboarding: true, requiresProfessionalVerification: false };
  }
  if (["property_owner", "property_lessor", "land_owner", "real_estate_consultant", "broker", "housing_society"].includes(identityKey)) {
    return { role: "vendor", modules: ["property_owner"], portalUseReason: "list_property_for_sale", requiresBusinessOnboarding: true, requiresProfessionalVerification: false };
  }
  if (["material_business", "manufacturer", "dealer", "distributor", "wholesaler", "retail_business"].includes(identityKey)) {
    return { role: "vendor", modules: ["materials"], portalUseReason: "sell_materials", requiresBusinessOnboarding: true, requiresProfessionalVerification: false };
  }
  if (["rental_business", "equipment_owner"].includes(identityKey)) {
    return { role: "vendor", modules: ["rentals"], portalUseReason: "provide_rentals", requiresBusinessOnboarding: true, requiresProfessionalVerification: false };
  }
  if (["author", "knowledge_creator", "trainer", "researcher", "institution"].includes(identityKey)) {
    return { role: "blogger", modules: ["blog_author"], portalUseReason: "publish_blog_or_news", requiresBusinessOnboarding: true, requiresProfessionalVerification: false };
  }
  if (identityKey === "investor") {
    return { role: "investor", modules: ["investor"], portalUseReason: "invest_in_opportunities", requiresBusinessOnboarding: false, requiresProfessionalVerification: false };
  }
  if (identityKey === "multi_business_operator") {
    return { role: "hub_vendor", modules: ["materials", "services", "rentals", "property_owner", "property_builder", "blog_author", "investor"], portalUseReason: "operate_multiple_businesses", requiresBusinessOnboarding: true, requiresProfessionalVerification: false };
  }
  if (identityKey === "banker") {
    return { role: "banker", modules: [], portalUseReason: "finance_professional", requiresBusinessOnboarding: false, requiresProfessionalVerification: true };
  }
  if (["financial_institution", "lender"].includes(identityKey)) {
    return { role: "vendor", modules: ["services"], portalUseReason: "finance_professional", requiresBusinessOnboarding: true, requiresProfessionalVerification: true };
  }
  if (SERVICE_IDENTITIES.has(identityKey)) {
    return { role: "vendor", modules: ["services"], portalUseReason: "offer_services", requiresBusinessOnboarding: true, requiresProfessionalVerification: REGULATED_IDENTITIES.has(identityKey) };
  }
  return { role: "vendor", modules: ["services"], portalUseReason: "other_profession_or_business", requiresBusinessOnboarding: true, requiresProfessionalVerification: REGULATED_IDENTITIES.has(identityKey) };
}

export function getLocalIdentityLabel(identityKey: HumanIdentityKey, stateName: string): string {
  const standard = HUMAN_IDENTITY_REGISTRY[identityKey].label;
  // Reserved for future state-specific aliases. The familiar terms in the
  // approved registry labels must be visible before location is selected.
  void stateName;
  return standard;
}

export function getIdentityFamilyOptions(family: IdentityFamilyKey) {
  return DECLARABLE_IDENTITIES
    .map((key) => HUMAN_IDENTITY_REGISTRY[key])
    .filter((item) => item.family === family);
}

export function getIdentityFamilyLabel(family: IdentityFamilyKey) {
  return HUMAN_IDENTITY_FAMILIES[family].label;
}
