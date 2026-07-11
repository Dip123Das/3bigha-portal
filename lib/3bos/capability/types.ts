import type { HumanIdentityKey } from "../identity";
import type { WorkspaceKey } from "../workspace";

export type CapabilityKey =
  | "business_profile"
  | "marketplace"
  | "property_management"
  | "inventory"
  | "billing"
  | "business_operations"
  | "customer_relationships"
  | "rfq"
  | "intelligent_assistance"
  | "business_insights"
  | "promotion"
  | "enterprise"
  | "communication"
  | "trust"
  | "knowledge"
  | "project_management"
  | "finance"
  | "investment"
  | "dispatch"
  | "fleet";

export type CapabilityLevel =
  | "none"
  | "basic"
  | "limited"
  | "standard"
  | "full"
  | "advanced"
  | "priority"
  | "executive"
  | "unlimited"
  | "enterprise";

export type GrowthPlanKey = "start" | "grow" | "manage" | "scale";

export type LegacyPlanKey =
  | "free"
  | "basic_vendor"
  | "silver_vendor"
  | "gold_vendor"
  | "platinum_vendor"
  | "premium_vendor"
  | "hub_vendor"
  | string;

export type CapabilityDefinition = {
  key: CapabilityKey;
  label: string;
  description: string;
  owningEngine:
    | "identity"
    | "workspace"
    | "capability"
    | "growth"
    | "marketplace"
    | "ai"
    | "trust"
    | "communication"
    | "enterprise"
    | "business_operations";
  identities?: HumanIdentityKey[];
  workspaces?: WorkspaceKey[];
};

export type GrowthPlanCapability = {
  level: CapabilityLevel;
  limit?: number | null;
  description: string;
};

export type GrowthPlanDefinition = {
  key: GrowthPlanKey;
  label: string;
  description: string;
  capabilities: Partial<Record<CapabilityKey, GrowthPlanCapability>>;
  teamMembers: number | null;
  branches: number | null;
  marketplaceVisibility: "standard" | "enhanced" | "high" | "premium";
};

export type LegacyPlanResolution = {
  legacyPlan: string;
  growthPlan: GrowthPlanKey;
  isLegacyAlias: boolean;
  notes: string[];
};
