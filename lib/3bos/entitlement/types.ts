import type {
  CapabilityKey,
  CapabilityLevel,
  GrowthPlanKey,
} from "../capability";
import type { HumanIdentityKey } from "../identity";
import type { WorkspaceKey } from "../workspace";

export type EntitlementDecisionCode =
  | "allowed"
  | "allowed_with_limit"
  | "upgrade_required"
  | "verification_required"
  | "role_not_applicable"
  | "workspace_not_applicable"
  | "subscription_inactive"
  | "usage_exhausted"
  | "temporarily_unavailable";

export type EntitlementVerificationRequirement =
  | "identity"
  | "business"
  | "location";

export type EntitlementActionPolicy = {
  action: string;
  label: string;
  description: string;
  parentCapability: CapabilityKey;

  applicableIdentities?: readonly HumanIdentityKey[];
  applicableWorkspaces?: readonly WorkspaceKey[];

  minimumPlan?: GrowthPlanKey;
  minimumCapabilityLevel?: CapabilityLevel;

  limit?: number | null;
  verificationRequired?: readonly EntitlementVerificationRequirement[];

  aiAssisted?: boolean;
  serverEnforced?: boolean;
  temporarilyAvailable?: boolean;

  freeAlternative?: string | null;
  upgradeHref?: string;
};

export type EntitlementUsage = {
  used: number;
  limit?: number | null;
};

export type EntitlementDecision = {
  decision: EntitlementDecisionCode;
  allowed: boolean;

  action: string;
  label: string;
  parentCapability: CapabilityKey;

  currentPlan: GrowthPlanKey;
  requiredPlan: GrowthPlanKey | null;

  currentCapabilityLevel: CapabilityLevel;
  requiredCapabilityLevel: CapabilityLevel | null;

  usage: {
    used: number;
    limit: number | null;
    remaining: number | null;
  } | null;

  missingVerification: readonly EntitlementVerificationRequirement[];

  reason: string;
  freeAlternative: string | null;
  upgradeHref: string | null;

  aiAssisted: boolean;
  serverEnforced: boolean;
  readOnly: true;
};
