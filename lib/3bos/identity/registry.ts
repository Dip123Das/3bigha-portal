import type {
  HumanIdentityDefinition,
  HumanIdentityKey,
  IdentityFamilyKey,
} from "./types";

const identity = (
  value: HumanIdentityDefinition
): HumanIdentityDefinition => value;

export const HUMAN_IDENTITY_REGISTRY: Record<
  HumanIdentityKey,
  HumanIdentityDefinition
> = {
  customer: identity({
    key: "customer",
    family: "customer",
    label: "Customer",
    workspaceLabel: "My Requirements",
    description:
      "A person looking to build, buy, sell, hire, rent or submit a requirement.",
    status: "production",
    legacyRoles: ["buyer"],
    legacyPurposes: ["buy_property_or_materials"],
  }),

  property_seeker: identity({
    key: "property_seeker", family: "customer", label: "Property Seeker",
    workspaceLabel: "Property Requirements", description: "A person looking to buy land, a home or another property.",
    status: "production", parent: "customer", legacyRoles: ["buyer"], legacyPurposes: ["buy_property_or_materials"],
  }),

  tenant: identity({
    key: "tenant", family: "customer", label: "Tenant / Property Renter",
    workspaceLabel: "Rental Requirements", description: "A person looking to rent a home, workplace or other property.",
    status: "foundation", parent: "customer", legacyRoles: ["buyer"],
  }),

  property_owner: identity({
    key: "property_owner",
    family: "property_real_estate",
    label: "Property Owner",
    workspaceLabel: "Property Workspace",
    description: "A person managing, selling, renting or presenting property.",
    status: "production",
    legacyModules: ["property", "property_owner"],
    legacyBusinessActivities: ["property"],
    legacyPurposes: ["list_property_for_sale"],
  }),

  property_lessor: identity({
    key: "property_lessor", family: "property_real_estate", label: "Property Lessor / Property Owner",
    workspaceLabel: "Property Rental Workspace", description: "A property owner offering a property for rent or lease.",
    status: "foundation", parent: "property_owner",
  }),

  land_owner: identity({
    key: "land_owner",
    family: "property_real_estate",
    label: "Land Owner",
    workspaceLabel: "Land Workspace",
    description: "A person managing or presenting land and land opportunities.",
    status: "foundation",
    parent: "property_owner",
  }),

  builder: identity({
    key: "builder",
    family: "property_real_estate",
    label: "Builder",
    workspaceLabel: "Builder Workspace",
    description:
      "A builder managing projects, properties, customers and construction work.",
    status: "production",
    legacyRoles: ["builder"],
    legacyModules: ["property_builder"],
    legacyBusinessActivities: ["property"],
    legacyPurposes: ["manage_builder_projects"],
  }),

  real_estate_developer: identity({
    key: "real_estate_developer",
    family: "property_real_estate",
    label: "Real Estate Project Developer (Promoter)",
    workspaceLabel: "Real Estate Project Workspace",
    description: "A person or organisation that owns and develops real-estate projects and manages project inventory.",
    status: "partial",
    parent: "builder",
  }),

  real_estate_consultant: identity({
    key: "real_estate_consultant",
    family: "property_real_estate",
    label: "Real Estate Consultant",
    workspaceLabel: "Real Estate Professional Workspace",
    description:
      "A professional assisting people with property discovery and transactions.",
    status: "foundation",
  }),

  broker: identity({
    key: "broker",
    family: "property_real_estate",
    label: "Property Broker",
    workspaceLabel: "Property Professional Workspace",
    description: "A professional facilitating property opportunities.",
    status: "partial",
    parent: "real_estate_consultant",
  }),

  housing_society: identity({
    key: "housing_society",
    family: "property_real_estate",
    label: "Housing Society",
    workspaceLabel: "Housing Society Workspace",
    description: "A housing society or apartment association.",
    status: "future",
  }),

  construction_business: identity({
    key: "construction_business",
    family: "construction",
    label: "Construction Business",
    workspaceLabel: "Construction Business Workspace",
    description:
      "A business managing construction projects, teams, customers and operations.",
    status: "production",
    legacyModules: ["services", "property_builder"],
    legacyBusinessActivities: ["services", "property"],
  }),

  contractor: identity({
    key: "contractor",
    family: "construction",
    label: "Building Contractor",
    workspaceLabel: "Building Contractor Workspace",
    description:
      "A contractor managing construction work, quotations and customers.",
    status: "partial",
    parent: "construction_business",
    legacyModules: ["services"],
    legacyBusinessActivities: ["services"],
    legacyPurposes: ["offer_services"],
  }),

  civil_contractor: identity({
    key: "civil_contractor",
    family: "construction",
    label: "Civil Contractor",
    workspaceLabel: "Civil Contractor Workspace",
    description: "A contractor undertaking civil construction work.",
    status: "foundation",
    parent: "contractor",
  }),

  electrical_contractor: identity({
    key: "electrical_contractor",
    family: "construction",
    label: "Electrical Contractor",
    workspaceLabel: "Electrical Contractor Workspace",
    description: "A contractor undertaking electrical work.",
    status: "foundation",
    parent: "contractor",
  }),

  plumbing_contractor: identity({
    key: "plumbing_contractor",
    family: "construction",
    label: "Plumbing Contractor",
    workspaceLabel: "Plumbing Contractor Workspace",
    description: "A contractor undertaking plumbing work.",
    status: "foundation",
    parent: "contractor",
  }),

  interior_contractor: identity({
    key: "interior_contractor",
    family: "construction",
    label: "Interior Contractor",
    workspaceLabel: "Interior Contractor Workspace",
    description: "A contractor undertaking interior construction and finishing.",
    status: "foundation",
    parent: "contractor",
  }),

  road_contractor: identity({
    key: "road_contractor",
    family: "construction",
    label: "Road Contractor",
    workspaceLabel: "Road Contractor Workspace",
    description: "A contractor undertaking road and related infrastructure work.",
    status: "foundation",
    parent: "contractor",
  }),

  infrastructure_contractor: identity({
    key: "infrastructure_contractor",
    family: "construction",
    label: "Infrastructure Contractor",
    workspaceLabel: "Infrastructure Workspace",
    description: "A contractor undertaking larger infrastructure work.",
    status: "future",
    parent: "contractor",
  }),

  material_business: identity({
    key: "material_business",
    family: "materials_supply",
    label: "Material Business",
    workspaceLabel: "Material Business Workspace",
    description:
      "A business manufacturing, distributing or selling construction materials.",
    status: "production",
    legacyRoles: ["vendor", "hub_vendor"],
    legacyModules: ["materials"],
    legacyBusinessActivities: ["materials"],
    legacyPurposes: ["sell_materials"],
  }),

  manufacturer: identity({
    key: "manufacturer",
    family: "materials_supply",
    label: "Manufacturer",
    workspaceLabel: "Manufacturing Business Workspace",
    description: "A business manufacturing materials, equipment or products.",
    status: "partial",
    parent: "material_business",
  }),

  dealer: identity({
    key: "dealer",
    family: "materials_supply",
    label: "Dealer",
    workspaceLabel: "Dealer Business Workspace",
    description: "A business dealing in materials, equipment or products.",
    status: "partial",
    parent: "material_business",
  }),

  distributor: identity({
    key: "distributor",
    family: "materials_supply",
    label: "Distributor",
    workspaceLabel: "Distribution Business Workspace",
    description: "A business distributing materials, equipment or products.",
    status: "partial",
    parent: "material_business",
  }),

  wholesaler: identity({
    key: "wholesaler",
    family: "materials_supply",
    label: "Wholesaler",
    workspaceLabel: "Wholesale Business Workspace",
    description: "A wholesale material or product business.",
    status: "foundation",
    parent: "material_business",
  }),

  retail_business: identity({
    key: "retail_business",
    family: "materials_supply",
    label: "Retail Business",
    workspaceLabel: "Retail Business Workspace",
    description: "A local retail material or product business.",
    status: "foundation",
    parent: "material_business",
  }),

  rental_business: identity({
    key: "rental_business",
    family: "equipment_rental",
    label: "Rental Business",
    workspaceLabel: "Rental Business Workspace",
    description:
      "A business providing equipment, machinery, tools or spaces on rent.",
    status: "production",
    legacyRoles: ["vendor", "hub_vendor"],
    legacyModules: ["rentals"],
    legacyBusinessActivities: ["rentals"],
    legacyPurposes: ["provide_rentals"],
  }),

  equipment_owner: identity({
    key: "equipment_owner",
    family: "equipment_rental",
    label: "Equipment Owner",
    workspaceLabel: "Equipment Workspace",
    description: "A person or business owning rentable equipment.",
    status: "partial",
    parent: "rental_business",
  }),

  machine_operator: identity({
    key: "machine_operator",
    family: "equipment_rental",
    label: "Machine Operator",
    workspaceLabel: "Machine Operator Workspace",
    description: "A skilled person operating construction machinery.",
    status: "foundation",
    parent: "skilled_workforce",
  }),

  professional: identity({
    key: "professional",
    family: "professional",
    label: "Professional",
    workspaceLabel: "Professional Workspace",
    description: "A person providing specialised professional knowledge.",
    status: "production",
    legacyModules: ["services"],
    legacyBusinessActivities: ["services"],
    legacyPurposes: ["offer_services"],
  }),

  architect: identity({
    key: "architect",
    family: "professional",
    label: "Architect",
    workspaceLabel: "Architect Workspace",
    description: "An architect providing design and professional services.",
    status: "partial",
    parent: "professional",
  }),

  engineer: identity({
    key: "engineer",
    family: "professional",
    label: "Engineer",
    workspaceLabel: "Engineer Workspace",
    description: "An engineer providing technical or consulting services.",
    status: "partial",
    parent: "professional",
  }),

  structural_engineer: identity({
    key: "structural_engineer",
    family: "professional",
    label: "Structural Engineer",
    workspaceLabel: "Structural Engineer Workspace",
    description: "An engineer specialising in structural work.",
    status: "foundation",
    parent: "engineer",
  }),

  surveyor: identity({
    key: "surveyor",
    family: "professional",
    label: "Land Surveyor (Amin)",
    workspaceLabel: "Land Survey Workspace",
    description: "A professional providing land or construction surveys.",
    status: "partial",
    parent: "professional",
  }),

  interior_designer: identity({
    key: "interior_designer",
    family: "professional",
    label: "Interior Designer",
    workspaceLabel: "Interior Designer Workspace",
    description: "A professional providing interior design services.",
    status: "partial",
    parent: "professional",
  }),

  landscape_designer: identity({
    key: "landscape_designer",
    family: "professional",
    label: "Landscape Designer",
    workspaceLabel: "Landscape Designer Workspace",
    description: "A professional providing landscape design services.",
    status: "future",
    parent: "professional",
  }),

  project_management_consultant: identity({
    key: "project_management_consultant",
    family: "professional",
    label: "Project Management Consultant",
    workspaceLabel: "Project Management Workspace",
    description: "A professional managing and coordinating projects.",
    status: "foundation",
    parent: "professional",
  }),

  valuation_professional: identity({
    key: "valuation_professional",
    family: "professional",
    label: "Property Valuation Professional",
    workspaceLabel: "Valuation Workspace",
    description: "A professional providing valuation services.",
    status: "foundation",
    parent: "professional",
  }),

  registered_valuer: identity({
    key: "registered_valuer", family: "professional", label: "Registered Valuer",
    workspaceLabel: "Registered Valuation Workspace", description: "A verified registered professional providing regulated valuation services.",
    status: "foundation", parent: "valuation_professional",
  }),

  environmental_consultant: identity({
    key: "environmental_consultant",
    family: "professional",
    label: "Environmental Consultant",
    workspaceLabel: "Environmental Professional Workspace",
    description: "A professional providing environmental guidance.",
    status: "future",
    parent: "professional",
  }),

  lawyer: identity({
    key: "lawyer",
    family: "legal_compliance",
    label: "Lawyer",
    workspaceLabel: "Legal Professional Workspace",
    description: "A lawyer providing property, construction or business support.",
    status: "partial",
    legacyModules: ["services"],
  }),

  chartered_accountant: identity({
    key: "chartered_accountant",
    family: "legal_compliance",
    label: "Chartered Accountant",
    workspaceLabel: "Financial Professional Workspace",
    description: "A Chartered Accountant providing financial and compliance services.",
    status: "foundation",
  }),

  company_secretary: identity({
    key: "company_secretary",
    family: "legal_compliance",
    label: "Company Secretary",
    workspaceLabel: "Compliance Professional Workspace",
    description: "A professional providing company compliance support.",
    status: "future",
  }),

  tax_consultant: identity({
    key: "tax_consultant",
    family: "legal_compliance",
    label: "Tax Consultant",
    workspaceLabel: "Tax Professional Workspace",
    description: "A professional providing taxation support.",
    status: "foundation",
  }),

  gst_consultant: identity({
    key: "gst_consultant",
    family: "legal_compliance",
    label: "GST Consultant",
    workspaceLabel: "GST Professional Workspace",
    description: "A professional providing GST-related support.",
    status: "foundation",
  }),

  banker: identity({
    key: "banker",
    family: "finance_investment",
    label: "Banking Professional",
    workspaceLabel: "Banking Professional Workspace",
    description: "A banking professional handling eligible finance opportunities.",
    status: "production",
  }),

  financial_institution: identity({
    key: "financial_institution",
    family: "finance_investment",
    label: "Financial Institution",
    workspaceLabel: "Financial Institution Workspace",
    description: "An institution providing finance or lending services.",
    status: "production",
  }),

  lender: identity({
    key: "lender",
    family: "finance_investment",
    label: "Lender",
    workspaceLabel: "Lending Workspace",
    description: "An authorised lending organisation or professional.",
    status: "production",
    parent: "financial_institution",
  }),

  loan_consultant: identity({
    key: "loan_consultant",
    family: "finance_investment",
    label: "Loan Consultant",
    workspaceLabel: "Loan Consultant Workspace",
    description: "A professional assisting people with eligible finance options.",
    status: "partial",
  }),

  investor: identity({
    key: "investor",
    family: "finance_investment",
    label: "Investor",
    workspaceLabel: "Investment Workspace",
    description: "A person or organisation exploring investment opportunities.",
    status: "production",
    legacyModules: ["investor"],
    legacyPurposes: ["invest_in_opportunities"],
  }),

  insurance_advisor: identity({
    key: "insurance_advisor",
    family: "finance_investment",
    label: "Insurance Advisor",
    workspaceLabel: "Insurance Professional Workspace",
    description: "A professional providing insurance guidance.",
    status: "future",
  }),

  skilled_workforce: identity({
    key: "skilled_workforce",
    family: "skilled_workforce",
    label: "Skilled Construction Professional",
    workspaceLabel: "Skilled Workforce Workspace",
    description: "A skilled person or team offering practical services.",
    status: "production",
    legacyModules: ["services"],
    legacyBusinessActivities: ["services"],
  }),

  mason: identity({
    key: "mason",
    family: "skilled_workforce",
    label: "Masonry Professional (Rajmistri)",
    workspaceLabel: "Mason Workspace",
    description: "A skilled masonry professional.",
    status: "partial",
    parent: "skilled_workforce",
  }),

  carpenter: identity({
    key: "carpenter",
    family: "skilled_workforce",
    label: "Carpentry Professional (Chhutor Mistri)",
    workspaceLabel: "Carpenter Workspace",
    description: "A skilled carpentry professional.",
    status: "partial",
    parent: "skilled_workforce",
  }),

  electrician: identity({
    key: "electrician",
    family: "skilled_workforce",
    label: "Electrical Technician",
    workspaceLabel: "Electrician Workspace",
    description: "A skilled electrical professional.",
    status: "partial",
    parent: "skilled_workforce",
  }),

  plumber: identity({
    key: "plumber",
    family: "skilled_workforce",
    label: "Plumbing Professional",
    workspaceLabel: "Plumber Workspace",
    description: "A skilled plumbing professional.",
    status: "partial",
    parent: "skilled_workforce",
  }),

  painter: identity({
    key: "painter",
    family: "skilled_workforce",
    label: "Painting Professional",
    workspaceLabel: "Painter Workspace",
    description: "A skilled painting professional.",
    status: "partial",
    parent: "skilled_workforce",
  }),

  fabricator: identity({
    key: "fabricator",
    family: "skilled_workforce",
    label: "Fabrication Professional",
    workspaceLabel: "Fabricator Workspace",
    description: "A skilled fabrication professional.",
    status: "partial",
    parent: "skilled_workforce",
  }),

  welder: identity({
    key: "welder",
    family: "skilled_workforce",
    label: "Welding Professional",
    workspaceLabel: "Welder Workspace",
    description: "A skilled welding professional.",
    status: "partial",
    parent: "skilled_workforce",
  }),

  tile_installer: identity({
    key: "tile_installer",
    family: "skilled_workforce",
    label: "Tile Installation Professional",
    workspaceLabel: "Tile Installer Workspace",
    description: "A skilled tile installation professional.",
    status: "foundation",
    parent: "skilled_workforce",
  }),

  steel_fixer: identity({
    key: "steel_fixer",
    family: "skilled_workforce",
    label: "Steel Fixing Professional",
    workspaceLabel: "Steel Fixer Workspace",
    description: "A skilled reinforcement and steel-fixing professional.",
    status: "foundation",
    parent: "skilled_workforce",
  }),

  bar_bender: identity({
    key: "bar_bender",
    family: "skilled_workforce",
    label: "Bar Bending Professional",
    workspaceLabel: "Bar Bender Workspace",
    description: "A skilled bar-bending professional.",
    status: "foundation",
    parent: "skilled_workforce",
  }),

  supervisor: identity({
    key: "supervisor",
    family: "skilled_workforce",
    label: "Construction Supervisor",
    workspaceLabel: "Supervisor Workspace",
    description: "A person supervising construction work and teams.",
    status: "partial",
    parent: "skilled_workforce",
  }),

  construction_support_worker: identity({
    key: "construction_support_worker", family: "skilled_workforce", label: "Construction Support Worker",
    workspaceLabel: "Construction Support Workspace", description: "A person supporting construction teams and practical site work.",
    status: "foundation", parent: "skilled_workforce",
  }),

  transport_business: identity({
    key: "transport_business",
    family: "logistics",
    label: "Transport Business",
    workspaceLabel: "Transport Business Workspace",
    description: "A business transporting materials, equipment or goods.",
    status: "partial",
  }),

  fleet_owner: identity({
    key: "fleet_owner",
    family: "logistics",
    label: "Fleet Owner",
    workspaceLabel: "Fleet Workspace",
    description: "A person or business managing transport vehicles.",
    status: "production",
    parent: "transport_business",
  }),

  crane_service: identity({
    key: "crane_service",
    family: "logistics",
    label: "Crane Service",
    workspaceLabel: "Crane Service Workspace",
    description: "A business providing crane and lifting services.",
    status: "foundation",
    parent: "transport_business",
  }),

  delivery_partner: identity({
    key: "delivery_partner",
    family: "logistics",
    label: "Delivery Professional",
    workspaceLabel: "Delivery Workspace",
    description: "A person or business supporting delivery operations.",
    status: "partial",
    parent: "transport_business",
  }),

  farmer: identity({
    key: "farmer",
    family: "agriculture_rural",
    label: "Farmer",
    workspaceLabel: "Farmer Workspace",
    description: "A farmer managing land, requirements and rural business activity.",
    status: "foundation",
  }),

  agriculture_business: identity({
    key: "agriculture_business",
    family: "agriculture_rural",
    label: "Agriculture Business",
    workspaceLabel: "Agriculture Business Workspace",
    description: "A business connected to agriculture and rural activity.",
    status: "future",
  }),

  nursery: identity({
    key: "nursery",
    family: "agriculture_rural",
    label: "Nursery",
    workspaceLabel: "Nursery Business Workspace",
    description: "A nursery or plant-related business.",
    status: "future",
  }),

  irrigation_specialist: identity({
    key: "irrigation_specialist",
    family: "agriculture_rural",
    label: "Irrigation Specialist",
    workspaceLabel: "Irrigation Professional Workspace",
    description: "A professional providing irrigation services.",
    status: "future",
  }),

  government_department: identity({
    key: "government_department",
    family: "government_public",
    label: "Government Department",
    workspaceLabel: "Government Workspace",
    description: "A government department using authorised public workflows.",
    status: "foundation",
  }),

  municipality: identity({
    key: "municipality",
    family: "government_public",
    label: "Municipality",
    workspaceLabel: "Municipality Workspace",
    description: "An urban local body.",
    status: "future",
    parent: "government_department",
  }),

  panchayat: identity({
    key: "panchayat",
    family: "government_public",
    label: "Panchayat",
    workspaceLabel: "Panchayat Workspace",
    description: "A rural local body.",
    status: "future",
    parent: "government_department",
  }),

  development_authority: identity({
    key: "development_authority",
    family: "government_public",
    label: "Development Authority",
    workspaceLabel: "Development Authority Workspace",
    description: "A public development authority.",
    status: "future",
    parent: "government_department",
  }),

  public_sector_undertaking: identity({
    key: "public_sector_undertaking",
    family: "government_public",
    label: "Public Sector Undertaking",
    workspaceLabel: "Public Sector Workspace",
    description: "A public sector undertaking.",
    status: "future",
    parent: "government_department",
  }),

  author: identity({
    key: "author",
    family: "knowledge_media",
    label: "Author",
    workspaceLabel: "Author Workspace",
    description: "A person publishing knowledge, guidance or news.",
    status: "production",
    legacyRoles: ["blogger"],
    legacyModules: ["blog_author"],
    legacyBusinessActivities: ["blog"],
    legacyPurposes: ["publish_blog_or_news"],
  }),

  trainer: identity({
    key: "trainer",
    family: "knowledge_media",
    label: "Trainer",
    workspaceLabel: "Trainer Workspace",
    description: "A person providing training and learning support.",
    status: "future",
  }),

  researcher: identity({
    key: "researcher",
    family: "knowledge_media",
    label: "Researcher",
    workspaceLabel: "Research Workspace",
    description: "A person conducting and publishing research.",
    status: "future",
  }),

  institution: identity({
    key: "institution",
    family: "knowledge_media",
    label: "Institution",
    workspaceLabel: "Institution Workspace",
    description: "An educational, research or knowledge institution.",
    status: "future",
  }),

  knowledge_creator: identity({
    key: "knowledge_creator",
    family: "knowledge_media",
    label: "Knowledge Creator",
    workspaceLabel: "Knowledge Workspace",
    description: "A person creating useful professional knowledge.",
    status: "foundation",
    parent: "author",
  }),

  multi_business_operator: identity({
    key: "multi_business_operator", family: "materials_supply", label: "Multi-Business Operator",
    workspaceLabel: "Multi-Business Workspace", description: "A person or organisation operating more than one business through one account.",
    status: "production", legacyRoles: ["hub_vendor"],
  }),
};

export const HUMAN_IDENTITY_FAMILIES: Record<
  IdentityFamilyKey,
  { label: string; description: string }
> = {
  customer: {
    label: "Customer",
    description: "People using 3Bigha for their real needs.",
  },
  property_real_estate: {
    label: "Property & Real Estate",
    description: "Property owners, builders and real-estate professionals.",
  },
  construction: {
    label: "Construction",
    description: "Construction businesses and contractors.",
  },
  materials_supply: {
    label: "Materials & Supply",
    description: "Material businesses, manufacturers and supply-chain businesses.",
  },
  equipment_rental: {
    label: "Equipment & Rental",
    description: "Equipment owners, operators and rental businesses.",
  },
  professional: {
    label: "Professional Services",
    description: "Architects, engineers, surveyors and related professionals.",
  },
  legal_compliance: {
    label: "Legal & Compliance",
    description: "Legal, tax, accounting and compliance professionals.",
  },
  finance_investment: {
    label: "Finance & Investment",
    description: "Bankers, institutions, lenders, consultants and investors.",
  },
  skilled_workforce: {
    label: "Skilled Workforce",
    description: "Skilled people and practical trades.",
  },
  logistics: {
    label: "Transport & Logistics",
    description: "Transport, fleet and delivery businesses.",
  },
  agriculture_rural: {
    label: "Agriculture & Rural",
    description: "Farmers and rural businesses.",
  },
  government_public: {
    label: "Government & Public Institutions",
    description: "Government departments and public bodies.",
  },
  knowledge_media: {
    label: "Knowledge & Media",
    description: "Authors, trainers, researchers and institutions.",
  },
};

export function getHumanIdentity(
  key: HumanIdentityKey
): HumanIdentityDefinition {
  return HUMAN_IDENTITY_REGISTRY[key];
}

export function getHumanIdentitiesByFamily(
  family: IdentityFamilyKey
): HumanIdentityDefinition[] {
  return Object.values(HUMAN_IDENTITY_REGISTRY).filter(
    (item) => item.family === family
  );
}

export function getSelectableHumanIdentities(): HumanIdentityDefinition[] {
  return Object.values(HUMAN_IDENTITY_REGISTRY).filter(
    (item) => item.status !== "future"
  );
}
