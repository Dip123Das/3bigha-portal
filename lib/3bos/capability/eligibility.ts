import type { HumanIdentityKey } from "../identity";
import type {
  CapabilityKey,
  CapabilityLevel,
  GrowthPlanKey,
} from "./types";
import { GROWTH_PLAN_REGISTRY } from "./registry";

export const IDENTITY_CAPABILITY_ELIGIBILITY: Partial<
  Record<HumanIdentityKey, Partial<Record<CapabilityKey, CapabilityLevel>>>
> = {
  property_owner: {
    marketplace: "standard",
    property_management: "full",
    intelligent_assistance: "basic",
    business_insights: "basic",
    trust: "standard",
    communication: "standard",
  },
  material_business: {
    marketplace: "full",
    inventory: "full",
    billing: "full",
    business_operations: "full",
    customer_relationships: "full",
    rfq: "full",
    intelligent_assistance: "full",
    business_insights: "full",
    dispatch: "full",
    communication: "full",
    trust: "full",
  },
  rental_business: {
    marketplace: "full",
    inventory: "full",
    billing: "full",
    business_operations: "full",
    customer_relationships: "full",
    rfq: "full",
    intelligent_assistance: "full",
    business_insights: "full",
    fleet: "full",
    communication: "full",
    trust: "full",
  },
  contractor: {
    marketplace: "full",
    inventory: "limited",
    billing: "full",
    business_operations: "full",
    customer_relationships: "full",
    rfq: "full",
    intelligent_assistance: "full",
    business_insights: "full",
    project_management: "full",
    communication: "full",
    trust: "full",
  },
  architect: {
    marketplace: "full",
    billing: "full",
    business_operations: "limited",
    customer_relationships: "full",
    rfq: "full",
    intelligent_assistance: "full",
    business_insights: "full",
    project_management: "full",
    communication: "full",
    trust: "full",
  },
  lawyer: {
    marketplace: "full",
    billing: "full",
    customer_relationships: "full",
    rfq: "limited",
    intelligent_assistance: "full",
    business_insights: "basic",
    communication: "full",
    trust: "full",
  },
  skilled_workforce: {
    marketplace: "full",
    rfq: "limited",
    intelligent_assistance: "basic",
    communication: "standard",
    trust: "standard",
  },
  builder: {
    marketplace: "full",
    property_management: "full",
    project_management: "full",
    billing: "full",
    business_operations: "full",
    customer_relationships: "full",
    rfq: "full",
    intelligent_assistance: "full",
    business_insights: "full",
    finance: "full",
    investment: "full",
    communication: "full",
    trust: "full",
  },
  banker: {
    finance: "full",
    customer_relationships: "full",
    communication: "full",
    trust: "full",
    business_insights: "full",
  },
  investor: {
    investment: "full",
    marketplace: "full",
    communication: "full",
    trust: "full",
    business_insights: "full",
  },
  author: {
    knowledge: "full",
    communication: "full",
    trust: "full",
    business_insights: "full",
  },
  customer: {
    marketplace: "full",
    rfq: "full",
    communication: "full",
    intelligent_assistance: "standard",
    business_insights: "basic",
  },
};

export type CapabilityResolution = {
  capability: CapabilityKey;
  eligible: boolean;
  identityLevel: CapabilityLevel;
  planLevel: CapabilityLevel;
  effectiveLevel: CapabilityLevel;
  reason: string;
};

const LEVEL_ORDER: CapabilityLevel[] = [
  "none",
  "basic",
  "limited",
  "standard",
  "full",
  "advanced",
  "priority",
  "executive",
  "unlimited",
  "enterprise",
];

function lowerLevel(
  first: CapabilityLevel,
  second: CapabilityLevel
): CapabilityLevel {
  const firstIndex = LEVEL_ORDER.indexOf(first);
  const secondIndex = LEVEL_ORDER.indexOf(second);
  return LEVEL_ORDER[Math.min(firstIndex, secondIndex)] ?? "none";
}

export function resolveCapabilityForIdentityAndPlan(input: {
  identity: HumanIdentityKey;
  capability: CapabilityKey;
  plan: GrowthPlanKey;
}): CapabilityResolution {
  const identityLevel =
    IDENTITY_CAPABILITY_ELIGIBILITY[input.identity]?.[input.capability] ??
    "none";

  const planLevel =
    GROWTH_PLAN_REGISTRY[input.plan].capabilities[input.capability]?.level ??
    "none";

  if (identityLevel === "none") {
    return {
      capability: input.capability,
      eligible: false,
      identityLevel,
      planLevel,
      effectiveLevel: "none",
      reason: "This capability is not relevant to the selected identity.",
    };
  }

  if (planLevel === "none") {
    return {
      capability: input.capability,
      eligible: true,
      identityLevel,
      planLevel,
      effectiveLevel: "none",
      reason: "The identity is eligible, but the current Growth Plan does not include it.",
    };
  }

  return {
    capability: input.capability,
    eligible: true,
    identityLevel,
    planLevel,
    effectiveLevel: lowerLevel(identityLevel, planLevel),
    reason: "Resolved from identity relevance and Growth Plan level.",
  };
}
