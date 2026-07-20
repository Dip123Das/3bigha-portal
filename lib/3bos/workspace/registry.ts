import type {
  WorkspaceDefinition,
  WorkspaceKey,
} from "./types";

/**
 * Commercial segment workspaces a hub vendor may operate across. Regulated
 * or identity-specific workspaces remain outside this compatibility set and
 * still require their own human identity signals.
 */
export const HUB_VENDOR_BUSINESS_WORKSPACE_KEYS: readonly WorkspaceKey[] =
  Object.freeze([
    "property",
    "builder",
    "construction_business",
    "contractor",
    "material_business",
    "rental_business",
    "professional",
    "legal_professional",
    "investment",
    "skilled_workforce",
    "transport_business",
    "agriculture_business",
    "multi_business",
  ]);

const workspace = (
  value: WorkspaceDefinition
): WorkspaceDefinition => value;

export const WORKSPACE_REGISTRY: Record<
  WorkspaceKey,
  WorkspaceDefinition
> = {
  customer: workspace({
    key: "customer",
    label: "Customer Workspace",
    shortLabel: "My Requirements",
    description:
      "Create requirements, compare quotations, continue conversations and complete buying decisions.",
    status: "production",
    landingPath: "/dashboard/buyer",
    identities: ["customer"],
    capabilities: [
      "marketplace",
      "rfq",
      "communication",
      "intelligent_assistance",
      "business_insights",
    ],
    legacyRoles: ["buyer"],
    navigation: [
      {
        key: "requirements",
        label: "My Requirements",
        description: "Review submitted requirements and their progress.",
        href: "/dashboard/buyer/rfqs",
        capability: "rfq",
        status: "production",
      },
      {
        key: "submit_requirement",
        label: "Submit Requirement",
        description: "Tell 3Bigha what you need.",
        href: "/rfq",
        capability: "rfq",
        status: "production",
      },
      {
        key: "inbox",
        label: "Conversations",
        description: "Continue conversations connected to your requirements.",
        href: "/dashboard/inbox-v2",
        capability: "communication",
        status: "production",
      },
      {
        key: "marketplace",
        label: "Explore Marketplace",
        description: "Find property, materials, professionals and rentals.",
        href: "/search",
        capability: "marketplace",
        status: "production",
      },
    ],
  }),

  property: workspace({
    key: "property",
    label: "Property Workspace",
    shortLabel: "Property",
    description:
      "Manage property listings, ownership activity and property opportunities.",
    status: "production",
    landingPath: "/property/my",
    identities: [
      "property_owner",
      "land_owner",
      "real_estate_consultant",
      "broker",
    ],
    capabilities: [
      "marketplace",
      "property_management",
      "communication",
      "trust",
      "business_insights",
    ],
    legacyModules: ["property", "property_owner"],
    legacyBusinessActivities: ["property"],
    navigation: [
      {
        key: "my_properties",
        label: "My Properties",
        description: "Review and manage your property listings.",
        href: "/property/my",
        capability: "property_management",
        status: "production",
      },
      {
        key: "add_property",
        label: "Add Property",
        description: "Prepare a new property listing.",
        href: "/property/add",
        capability: "marketplace",
        status: "production",
      },
      {
        key: "property_market",
        label: "Property Marketplace",
        description: "Explore available property opportunities.",
        href: "/property",
        capability: "marketplace",
        status: "production",
      },
    ],
  }),

  builder: workspace({
    key: "builder",
    label: "Builder Workspace",
    shortLabel: "Builder",
    description:
      "Manage projects, units, property opportunities and construction activity.",
    status: "partial",
    landingPath: "/property/builder/projects",
    identities: ["builder", "real_estate_developer"],
    capabilities: [
      "marketplace",
      "property_management",
      "project_management",
      "rfq",
      "communication",
      "finance",
      "business_insights",
    ],
    legacyRoles: ["builder"],
    legacyModules: ["property_builder"],
    navigation: [
      {
        key: "projects",
        label: "Builder Projects",
        description: "Manage projects and property units.",
        href: "/property/builder/projects",
        capability: "project_management",
        status: "production",
      },
      {
        key: "construction_projects",
        label: "Construction Projects",
        description: "Review project execution and progress.",
        href: "/dashboard/construction-projects",
        capability: "project_management",
        status: "partial",
      },
      {
        key: "deal_rooms",
        label: "Deal Rooms",
        description: "Continue protected project and investment discussions.",
        href: "/dashboard/builder/deal-rooms",
        capability: "investment",
        status: "partial",
      },
      {
        key: "requirements",
        label: "Project Requirements",
        description: "Create material, service or equipment requirements.",
        href: "/rfq",
        capability: "rfq",
        status: "production",
      },
    ],
  }),

  construction_business: workspace({
    key: "construction_business",
    label: "Construction Business Workspace",
    shortLabel: "Construction Business",
    description:
      "Coordinate projects, quotations, customers, billing and business operations.",
    status: "partial",
    landingPath: "/dashboard/construction-projects",
    identities: [
      "construction_business",
      "infrastructure_contractor",
      "road_contractor",
    ],
    capabilities: [
      "marketplace",
      "project_management",
      "rfq",
      "billing",
      "customer_relationships",
      "business_operations",
      "communication",
      "business_insights",
    ],
    legacyModules: ["services", "property_builder"],
    navigation: [
      {
        key: "projects",
        label: "Construction Projects",
        description: "Review and manage construction work.",
        href: "/dashboard/construction-projects",
        capability: "project_management",
        status: "partial",
      },
      {
        key: "rfqs",
        label: "Requirements & Quotations",
        description: "Create and respond to project requirements.",
        href: "/rfq",
        capability: "rfq",
        status: "production",
      },
      {
        key: "services",
        label: "Construction Services",
        description: "Manage your construction service activity.",
        href: "/services/my",
        capability: "marketplace",
        status: "production",
      },
    ],
  }),

  contractor: workspace({
    key: "contractor",
    label: "Contractor Workspace",
    shortLabel: "Contractor",
    description:
      "Manage service listings, project work, quotations and customer conversations.",
    status: "partial",
    landingPath: "/services/my",
    identities: [
      "contractor",
      "civil_contractor",
      "electrical_contractor",
      "plumbing_contractor",
      "interior_contractor",
      "road_contractor",
    ],
    capabilities: [
      "marketplace",
      "project_management",
      "rfq",
      "billing",
      "customer_relationships",
      "communication",
      "business_insights",
    ],
    legacyModules: ["services"],
    legacyBusinessActivities: ["services"],
    navigation: [
      {
        key: "my_services",
        label: "My Services",
        description: "Manage the services you offer.",
        href: "/services/my",
        capability: "marketplace",
        status: "production",
      },
      {
        key: "add_service",
        label: "Add Service",
        description: "Present a new service professionally.",
        href: "/services/add",
        capability: "marketplace",
        status: "production",
      },
      {
        key: "buyer_requirements",
        label: "Customer Requirements",
        description: "Review relevant customer requirements.",
        href: "/dashboard/vendor/rfqs",
        capability: "rfq",
        status: "production",
      },
      {
        key: "messages",
        label: "Customer Conversations",
        description: "Continue customer discussions.",
        href: "/dashboard/vendor/inbox",
        capability: "communication",
        status: "production",
      },
    ],
  }),

  material_business: workspace({
    key: "material_business",
    label: "Material Business Workspace",
    shortLabel: "Material Business",
    description:
      "Manage materials, stock, quotations, billing, customers and dispatch.",
    status: "production",
    landingPath: "/dashboard/vendor",
    identities: [
      "material_business",
      "manufacturer",
      "dealer",
      "distributor",
      "wholesaler",
      "retail_business",
    ],
    capabilities: [
      "marketplace",
      "inventory",
      "billing",
      "business_operations",
      "customer_relationships",
      "rfq",
      "communication",
      "business_insights",
      "dispatch",
      "promotion",
      "trust",
    ],
    legacyRoles: ["vendor", "hub_vendor"],
    legacyModules: ["materials"],
    legacyBusinessActivities: ["materials"],
    navigation: [
      {
        key: "business_overview",
        label: "Business Overview",
        description: "Review today's important business work.",
        href: "/dashboard/vendor",
        capability: "business_operations",
        status: "production",
      },
      {
        key: "materials",
        label: "My Materials",
        description: "Manage material listings.",
        href: "/materials/my",
        capability: "marketplace",
        status: "production",
      },
      {
        key: "inventory",
        label: "Inventory",
        description: "Track stock and availability.",
        href: "/dashboard/vendor/inventory",
        capability: "inventory",
        status: "production",
      },
      {
        key: "billing",
        label: "Billing",
        description: "Prepare invoices and track payments.",
        href: "/dashboard/vendor/billing",
        capability: "billing",
        status: "production",
      },
      {
        key: "requirements",
        label: "Customer Requirements",
        description: "Review matching RFQs and customer needs.",
        href: "/dashboard/vendor/rfqs",
        capability: "rfq",
        status: "production",
      },
      {
        key: "dispatch",
        label: "Dispatch",
        description: "Coordinate deliveries and dispatch activity.",
        href: "/dashboard/vendor/dispatch",
        capability: "dispatch",
        status: "production",
      },
    ],
  }),

  rental_business: workspace({
    key: "rental_business",
    label: "Rental Business Workspace",
    shortLabel: "Rental Business",
    description:
      "Manage equipment listings, rental activity, customers and operations.",
    status: "production",
    landingPath: "/rentals/my",
    identities: ["rental_business", "equipment_owner"],
    capabilities: [
      "marketplace",
      "inventory",
      "billing",
      "business_operations",
      "customer_relationships",
      "rfq",
      "communication",
      "fleet",
      "business_insights",
    ],
    legacyModules: ["rentals"],
    legacyBusinessActivities: ["rentals"],
    navigation: [
      {
        key: "my_rentals",
        label: "My Rentals",
        description: "Manage equipment and rental listings.",
        href: "/rentals/my",
        capability: "marketplace",
        status: "production",
      },
      {
        key: "add_rental",
        label: "Add Equipment",
        description: "List machinery, tools or equipment for rent.",
        href: "/rentals/add",
        capability: "marketplace",
        status: "production",
      },
      {
        key: "fleet",
        label: "Fleet",
        description: "Review vehicles and operating assets.",
        href: "/dashboard/vendor/fleet",
        capability: "fleet",
        status: "production",
      },
      {
        key: "requirements",
        label: "Rental Requirements",
        description: "Review customer rental needs.",
        href: "/dashboard/vendor/rfqs",
        capability: "rfq",
        status: "production",
      },
    ],
  }),

  professional: workspace({
    key: "professional",
    label: "Professional Workspace",
    shortLabel: "Professional",
    description:
      "Present professional services, manage enquiries and continue client work.",
    status: "production",
    landingPath: "/services/my",
    identities: [
      "professional",
      "architect",
      "engineer",
      "structural_engineer",
      "surveyor",
      "interior_designer",
      "landscape_designer",
      "project_management_consultant",
      "valuation_professional",
      "environmental_consultant",
    ],
    capabilities: [
      "marketplace",
      "billing",
      "customer_relationships",
      "rfq",
      "communication",
      "intelligent_assistance",
      "business_insights",
      "trust",
    ],
    legacyModules: ["services"],
    legacyBusinessActivities: ["services"],
    navigation: [
      {
        key: "my_services",
        label: "My Professional Services",
        description: "Manage the services you provide.",
        href: "/services/my",
        capability: "marketplace",
        status: "production",
      },
      {
        key: "add_service",
        label: "Add Professional Service",
        description: "Present a service to customers.",
        href: "/services/add",
        capability: "marketplace",
        status: "production",
      },
      {
        key: "requirements",
        label: "Relevant Requirements",
        description: "Review customer requirements matching your work.",
        href: "/dashboard/vendor/rfqs",
        capability: "rfq",
        status: "production",
      },
      {
        key: "conversations",
        label: "Client Conversations",
        description: "Continue discussions with clients.",
        href: "/dashboard/vendor/inbox",
        capability: "communication",
        status: "production",
      },
    ],
  }),

  legal_professional: workspace({
    key: "legal_professional",
    label: "Legal & Compliance Workspace",
    shortLabel: "Legal Professional",
    description:
      "Present legal, accounting, taxation and compliance services.",
    status: "compatibility",
    landingPath: "/services/my",
    identities: [
      "lawyer",
      "chartered_accountant",
      "company_secretary",
      "tax_consultant",
      "gst_consultant",
    ],
    capabilities: [
      "marketplace",
      "billing",
      "customer_relationships",
      "communication",
      "trust",
    ],
    legacyModules: ["services"],
    navigation: [
      {
        key: "my_services",
        label: "My Professional Services",
        description: "Manage legal or compliance service listings.",
        href: "/services/my",
        capability: "marketplace",
        status: "production",
      },
      {
        key: "client_conversations",
        label: "Client Conversations",
        description: "Continue professional discussions.",
        href: "/dashboard/vendor/inbox",
        capability: "communication",
        status: "production",
      },
    ],
  }),

  banker: workspace({
    key: "banker",
    label: "Banker Workspace",
    shortLabel: "Banker",
    description:
      "Review assigned finance opportunities, lender offers and borrower progress.",
    status: "production",
    landingPath: "/dashboard/banker",
    identities: ["banker"],
    capabilities: [
      "finance",
      "customer_relationships",
      "communication",
      "trust",
      "business_insights",
    ],
    navigation: [
      {
        key: "finance_work",
        label: "Finance Work",
        description: "Review assigned finance leads and follow-ups.",
        href: "/dashboard/banker",
        capability: "finance",
        status: "production",
      },
      {
        key: "banker_profile",
        label: "Banker Profile",
        description: "Apply for or review verified banker access.",
        href: "/banker/apply",
        capability: "trust",
        status: "production",
      },
    ],
  }),

  financial_institution: workspace({
    key: "financial_institution",
    label: "Financial Institution Workspace",
    shortLabel: "Financial Institution",
    description:
      "Manage authorised lending products, finance opportunities and institutional teams.",
    status: "partial",
    landingPath: "/dashboard/banker",
    identities: ["financial_institution", "lender"],
    capabilities: [
      "finance",
      "customer_relationships",
      "communication",
      "trust",
      "enterprise",
      "business_insights",
    ],
    navigation: [
      {
        key: "finance_operations",
        label: "Finance Operations",
        description: "Review lending opportunities and offers.",
        href: "/dashboard/banker",
        capability: "finance",
        status: "production",
      },
    ],
  }),

  investment: workspace({
    key: "investment",
    label: "Investment Workspace",
    shortLabel: "Investment",
    description:
      "Explore opportunities, manage applications and continue deal-room activity.",
    status: "production",
    landingPath: "/dashboard/investor",
    identities: ["investor"],
    capabilities: [
      "investment",
      "marketplace",
      "communication",
      "trust",
      "business_insights",
    ],
    legacyModules: ["investor"],
    navigation: [
      {
        key: "overview",
        label: "Investment Overview",
        description: "Review opportunities, applications and deal rooms.",
        href: "/dashboard/investor",
        capability: "investment",
        status: "production",
      },
      {
        key: "opportunities",
        label: "Opportunities",
        description: "Review investment opportunities.",
        href: "/dashboard/investor/opportunities",
        capability: "investment",
        status: "production",
      },
      {
        key: "applications",
        label: "Applications",
        description: "Track your investment applications.",
        href: "/dashboard/investor/applications",
        capability: "investment",
        status: "production",
      },
      {
        key: "deal_rooms",
        label: "Deal Rooms",
        description: "Continue protected investment discussions.",
        href: "/dashboard/investor/deal-rooms",
        capability: "communication",
        status: "production",
      },
    ],
  }),

  skilled_workforce: workspace({
    key: "skilled_workforce",
    label: "Skilled Workforce Workspace",
    shortLabel: "Skilled Workforce",
    description:
      "Present practical skills, receive work opportunities and continue customer conversations.",
    status: "compatibility",
    landingPath: "/services/my",
    identities: [
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
      "machine_operator",
    ],
    capabilities: [
      "marketplace",
      "rfq",
      "communication",
      "trust",
    ],
    legacyModules: ["services"],
    legacyBusinessActivities: ["services"],
    navigation: [
      {
        key: "my_work",
        label: "My Work",
        description: "Manage the skills and work you offer.",
        href: "/services/my",
        capability: "marketplace",
        status: "production",
      },
      {
        key: "work_opportunities",
        label: "Work Opportunities",
        description: "Review relevant customer requirements.",
        href: "/dashboard/vendor/rfqs",
        capability: "rfq",
        status: "production",
      },
    ],
  }),

  transport_business: workspace({
    key: "transport_business",
    label: "Transport Business Workspace",
    shortLabel: "Transport Business",
    description:
      "Manage fleet, transport activity, dispatch and customer requirements.",
    status: "partial",
    landingPath: "/dashboard/vendor/fleet",
    identities: [
      "transport_business",
      "fleet_owner",
      "crane_service",
      "delivery_partner",
    ],
    capabilities: [
      "fleet",
      "dispatch",
      "rfq",
      "communication",
      "billing",
      "business_operations",
    ],
    navigation: [
      {
        key: "fleet",
        label: "Fleet",
        description: "Manage vehicles and operating assets.",
        href: "/dashboard/vendor/fleet",
        capability: "fleet",
        status: "production",
      },
      {
        key: "dispatch",
        label: "Dispatch",
        description: "Coordinate movement and delivery activity.",
        href: "/dashboard/vendor/dispatch",
        capability: "dispatch",
        status: "production",
      },
    ],
  }),

  agriculture_business: workspace({
    key: "agriculture_business",
    label: "Agriculture & Rural Workspace",
    shortLabel: "Agriculture",
    description:
      "Manage rural requirements, land, materials, equipment and local business activity.",
    status: "future",
    landingPath: "/dashboard",
    identities: [
      "farmer",
      "agriculture_business",
      "nursery",
      "irrigation_specialist",
    ],
    capabilities: [
      "marketplace",
      "rfq",
      "communication",
      "business_insights",
    ],
    navigation: [],
  }),

  government: workspace({
    key: "government",
    label: "Government Workspace",
    shortLabel: "Government",
    description:
      "Support authorised public requirements, procurement and institutional workflows.",
    status: "future",
    landingPath: "/dashboard",
    identities: [
      "government_department",
      "municipality",
      "panchayat",
      "development_authority",
      "public_sector_undertaking",
    ],
    capabilities: [
      "rfq",
      "project_management",
      "communication",
      "enterprise",
      "trust",
      "business_insights",
    ],
    navigation: [],
  }),

  author: workspace({
    key: "author",
    label: "Author Workspace",
    shortLabel: "Author",
    description:
      "Write, review and manage professional knowledge and publications.",
    status: "production",
    landingPath: "/blog/my",
    identities: [
      "author",
      "knowledge_creator",
      "trainer",
      "researcher",
      "institution",
    ],
    capabilities: [
      "knowledge",
      "communication",
      "trust",
      "business_insights",
    ],
    legacyRoles: ["blogger"],
    legacyModules: ["blog_author"],
    legacyBusinessActivities: ["blog"],
    navigation: [
      {
        key: "my_articles",
        label: "My Articles",
        description: "Review and manage your publications.",
        href: "/blog/my",
        capability: "knowledge",
        status: "production",
      },
      {
        key: "new_article",
        label: "Write Article",
        description: "Prepare a new publication.",
        href: "/blog/new",
        capability: "knowledge",
        status: "production",
      },
      {
        key: "public_blog",
        label: "Knowledge Library",
        description: "Explore published knowledge and updates.",
        href: "/blog",
        capability: "knowledge",
        status: "production",
      },
    ],
  }),

  multi_business: workspace({
    key: "multi_business",
    label: "My Workspaces",
    shortLabel: "My Workspaces",
    description:
      "Choose the identity or business area you want to work in.",
    status: "compatibility",
    landingPath: "/dashboard/vendor",
    identities: [],
    capabilities: [
      "marketplace",
      "inventory",
      "billing",
      "business_operations",
      "customer_relationships",
      "rfq",
      "communication",
      "business_insights",
      "enterprise",
    ],
    legacyRoles: ["hub_vendor"],
    navigation: [],
  }),
};

export function getWorkspace(
  key: WorkspaceKey
): WorkspaceDefinition {
  return WORKSPACE_REGISTRY[key];
}

export function getWorkspacesForIdentity(
  identityKey: WorkspaceDefinition["identities"][number]
): WorkspaceDefinition[] {
  return Object.values(WORKSPACE_REGISTRY).filter(
    (item) => item.identities.includes(identityKey)
  );
}

export function getProductionWorkspaces(): WorkspaceDefinition[] {
  return Object.values(WORKSPACE_REGISTRY).filter(
    (item) => item.status === "production"
  );
}

export function getAvailableWorkspaceNavigation(
  key: WorkspaceKey
) {
  return WORKSPACE_REGISTRY[key].navigation.filter(
    (item) => item.status !== "future"
  );
}
