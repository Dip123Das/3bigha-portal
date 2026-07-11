import type {
  CapabilityDefinition,
  CapabilityKey,
  GrowthPlanDefinition,
  GrowthPlanKey,
  LegacyPlanResolution,
} from "./types";

const capability = (
  value: CapabilityDefinition
): CapabilityDefinition => value;

export const CAPABILITY_REGISTRY: Record<
  CapabilityKey,
  CapabilityDefinition
> = {
  business_profile: capability({
    key: "business_profile",
    label: "Business Profile",
    description:
      "Present a person or business professionally with trusted contact and operating information.",
    owningEngine: "identity",
  }),
  marketplace: capability({
    key: "marketplace",
    label: "Marketplace",
    description:
      "Publish, discover, search and connect through the integrated marketplace.",
    owningEngine: "marketplace",
  }),
  property_management: capability({
    key: "property_management",
    label: "Property Management",
    description: "Manage property listings, projects, units and ownership activity.",
    owningEngine: "business_operations",
  }),
  inventory: capability({
    key: "inventory",
    label: "Inventory",
    description: "Track products, equipment, stock and availability.",
    owningEngine: "business_operations",
  }),
  billing: capability({
    key: "billing",
    label: "Billing",
    description: "Prepare bills, invoices and payment records.",
    owningEngine: "business_operations",
  }),
  business_operations: capability({
    key: "business_operations",
    label: "Business Operations",
    description: "Coordinate everyday operational work.",
    owningEngine: "business_operations",
  }),
  customer_relationships: capability({
    key: "customer_relationships",
    label: "Customer Relationships",
    description: "Organise enquiries, customers and follow-up activity.",
    owningEngine: "business_operations",
  }),
  rfq: capability({
    key: "rfq",
    label: "Requirements & Quotations",
    description: "Create, receive and respond to requirements and quotations.",
    owningEngine: "marketplace",
  }),
  intelligent_assistance: capability({
    key: "intelligent_assistance",
    label: "Intelligent Assistance",
    description:
      "Quietly prepare, check, suggest and organise work for human review.",
    owningEngine: "ai",
  }),
  business_insights: capability({
    key: "business_insights",
    label: "Business Insights",
    description: "Understand performance, opportunities and important changes.",
    owningEngine: "growth",
  }),
  promotion: capability({
    key: "promotion",
    label: "Business Promotion",
    description: "Increase appropriate marketplace visibility transparently.",
    owningEngine: "marketplace",
  }),
  enterprise: capability({
    key: "enterprise",
    label: "Enterprise Management",
    description: "Coordinate teams, branches, roles and organisation structures.",
    owningEngine: "enterprise",
  }),
  communication: capability({
    key: "communication",
    label: "Communication",
    description: "Continue messages, notifications and business discussions.",
    owningEngine: "communication",
  }),
  trust: capability({
    key: "trust",
    label: "Trust & Verification",
    description:
      "Build credibility through verification, history and transparent evidence.",
    owningEngine: "trust",
  }),
  knowledge: capability({
    key: "knowledge",
    label: "Knowledge & Publishing",
    description: "Create, manage and publish professional knowledge.",
    owningEngine: "business_operations",
  }),
  project_management: capability({
    key: "project_management",
    label: "Project Management",
    description: "Plan, coordinate and monitor project work.",
    owningEngine: "business_operations",
  }),
  finance: capability({
    key: "finance",
    label: "Finance",
    description: "Support authorised finance, lender and borrower workflows.",
    owningEngine: "business_operations",
  }),
  investment: capability({
    key: "investment",
    label: "Investment",
    description: "Manage opportunities, applications and protected discussions.",
    owningEngine: "business_operations",
  }),
  dispatch: capability({
    key: "dispatch",
    label: "Dispatch",
    description: "Coordinate delivery and movement activity.",
    owningEngine: "business_operations",
  }),
  fleet: capability({
    key: "fleet",
    label: "Fleet",
    description: "Manage vehicles, machines and operating assets.",
    owningEngine: "business_operations",
  }),
};

export const GROWTH_PLAN_REGISTRY: Record<
  GrowthPlanKey,
  GrowthPlanDefinition
> = {
  start: {
    key: "start",
    label: "Start",
    description: "Begin with the essential tools needed to become visible and organised.",
    teamMembers: 1,
    branches: 1,
    marketplaceVisibility: "standard",
    capabilities: {
      business_profile: {
        level: "full",
        description: "Complete professional profile.",
      },
      marketplace: {
        level: "standard",
        description: "Standard marketplace presence.",
      },
      inventory: {
        level: "basic",
        description: "Essential stock or listing management.",
      },
      billing: {
        level: "basic",
        description: "Essential billing tools.",
      },
      rfq: {
        level: "limited",
        description: "Limited requirements and quotation access.",
      },
      intelligent_assistance: {
        level: "limited",
        description: "Limited assistance for essential work.",
      },
      business_insights: {
        level: "none",
        description: "Advanced insights are not included yet.",
      },
      communication: {
        level: "standard",
        description: "Essential business communication.",
      },
      trust: {
        level: "standard",
        description: "Standard trust and verification tools.",
      },
    },
  },
  grow: {
    key: "grow",
    label: "Grow",
    description: "Reach more customers and organise a growing volume of work.",
    teamMembers: 3,
    branches: 1,
    marketplaceVisibility: "enhanced",
    capabilities: {
      business_profile: {
        level: "full",
        description: "Complete professional profile.",
      },
      marketplace: {
        level: "full",
        description: "Enhanced marketplace presence.",
      },
      inventory: {
        level: "full",
        description: "Full inventory tools.",
      },
      billing: {
        level: "full",
        description: "Professional billing tools.",
      },
      rfq: {
        level: "full",
        description: "Higher requirements and quotation access.",
      },
      intelligent_assistance: {
        level: "standard",
        description: "Standard intelligent assistance.",
      },
      business_insights: {
        level: "basic",
        description: "Basic business insights.",
      },
      customer_relationships: {
        level: "standard",
        description: "Standard customer relationship tools.",
      },
      communication: {
        level: "full",
        description: "Expanded business communication.",
      },
    },
  },
  manage: {
    key: "manage",
    label: "Manage",
    description: "Coordinate advanced operations, teams and customer work.",
    teamMembers: 10,
    branches: 3,
    marketplaceVisibility: "high",
    capabilities: {
      business_profile: {
        level: "full",
        description: "Complete professional profile.",
      },
      marketplace: {
        level: "advanced",
        description: "High marketplace presence.",
      },
      inventory: {
        level: "advanced",
        description: "Advanced inventory control.",
      },
      billing: {
        level: "advanced",
        description: "Operations-connected billing.",
      },
      business_operations: {
        level: "advanced",
        description: "Advanced business operations.",
      },
      customer_relationships: {
        level: "advanced",
        description: "Advanced customer relationship management.",
      },
      rfq: {
        level: "priority",
        description: "Priority requirements and quotation access.",
      },
      intelligent_assistance: {
        level: "advanced",
        description: "Advanced intelligent assistance.",
      },
      business_insights: {
        level: "advanced",
        description: "Advanced business insights.",
      },
      enterprise: {
        level: "limited",
        description: "Team and branch coordination.",
      },
    },
  },
  scale: {
    key: "scale",
    label: "Scale",
    description: "Coordinate larger teams, branches and enterprise operations.",
    teamMembers: null,
    branches: null,
    marketplaceVisibility: "premium",
    capabilities: {
      business_profile: {
        level: "full",
        description: "Complete professional profile.",
      },
      marketplace: {
        level: "unlimited",
        description: "Premium marketplace presence.",
      },
      inventory: {
        level: "unlimited",
        description: "Unlimited inventory scale.",
      },
      billing: {
        level: "enterprise",
        description: "Enterprise billing and operations.",
      },
      business_operations: {
        level: "enterprise",
        description: "Enterprise operations.",
      },
      customer_relationships: {
        level: "enterprise",
        description: "Enterprise customer relationship tools.",
      },
      rfq: {
        level: "priority",
        description: "Highest requirements and quotation priority.",
      },
      intelligent_assistance: {
        level: "advanced",
        description: "Premium intelligent assistance.",
      },
      business_insights: {
        level: "executive",
        description: "Executive business insights.",
      },
      enterprise: {
        level: "enterprise",
        description: "Enterprise team and branch management.",
      },
    },
  },
};

export function resolveLegacyGrowthPlan(
  value: unknown
): LegacyPlanResolution {
  const legacyPlan = String(value ?? "free").trim().toLowerCase() || "free";

  if (legacyPlan === "free" || legacyPlan === "basic_vendor") {
    return {
      legacyPlan,
      growthPlan: "start",
      isLegacyAlias: true,
      notes: [
        "Existing commercial access remains unchanged.",
        "Start is the human-facing growth-stage label.",
      ],
    };
  }

  if (legacyPlan === "silver_vendor") {
    return {
      legacyPlan,
      growthPlan: "grow",
      isLegacyAlias: true,
      notes: [
        "Existing commercial access remains unchanged.",
        "Grow is the human-facing growth-stage label.",
      ],
    };
  }

  if (
    legacyPlan === "gold_vendor" ||
    legacyPlan === "premium_vendor"
  ) {
    return {
      legacyPlan,
      growthPlan: "manage",
      isLegacyAlias: true,
      notes: [
        "premium_vendor is retained as a legacy alias.",
        "Manage is the human-facing growth-stage label.",
      ],
    };
  }

  if (
    legacyPlan === "platinum_vendor" ||
    legacyPlan === "hub_vendor"
  ) {
    return {
      legacyPlan,
      growthPlan: "scale",
      isLegacyAlias: true,
      notes: [
        "hub_vendor may also represent legacy access structure.",
        "Scale is the human-facing growth-stage label.",
      ],
    };
  }

  if (
    legacyPlan === "start" ||
    legacyPlan === "grow" ||
    legacyPlan === "manage" ||
    legacyPlan === "scale"
  ) {
    return {
      legacyPlan,
      growthPlan: legacyPlan,
      isLegacyAlias: false,
      notes: [],
    };
  }

  return {
    legacyPlan,
    growthPlan: "start",
    isLegacyAlias: true,
    notes: [
      "Unknown legacy plan preserved without changing production access.",
      "Start is used only as the safe human-facing fallback.",
    ],
  };
}

export function getGrowthPlan(
  key: GrowthPlanKey
): GrowthPlanDefinition {
  return GROWTH_PLAN_REGISTRY[key];
}

export function getCapability(
  key: CapabilityKey
): CapabilityDefinition {
  return CAPABILITY_REGISTRY[key];
}
