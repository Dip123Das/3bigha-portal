import type {
  HumanIdentityDefinition,
  HumanIdentityKey,
  IdentitySuggestion,
  LegacyIdentitySignals,
} from "../identity";
import type {
  GrowthPlanDefinition,
  GrowthPlanKey,
  GrowthPlanPresentation,
  LegacyPlanKey,
} from "../capability";
import type {
  WorkspaceDefinition,
  WorkspaceKey,
} from "../workspace";

export type SubscriptionState =
  | "free"
  | "active"
  | "inactive"
  | "expired"
  | "unknown";

export type VerificationState = {
  identityVerified: boolean;
  businessVerified: boolean;
  locationVerified: boolean;
};

export type HumanAccessContextInput = {
  selectedIdentity?: HumanIdentityKey | null;
  legacyIdentitySignals?: LegacyIdentitySignals;
  activeWorkspace?: WorkspaceKey | null;
  commercialPlan?: LegacyPlanKey | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | null;
  verification?: Partial<VerificationState>;
};

export type HumanAccessContext = {
  primaryIdentity: HumanIdentityDefinition | null;
  identitySource: "selected" | "legacy_suggestion" | "unresolved";
  identitySuggestions: readonly IdentitySuggestion[];
  legacyRole: string | null;

  applicableWorkspaces: readonly WorkspaceDefinition[];
  activeWorkspace: WorkspaceDefinition | null;

  commercialPlan: string;
  growthPlan: GrowthPlanKey;
  growthPlanDefinition: GrowthPlanDefinition;
  growthPlanPresentation: GrowthPlanPresentation;
  subscriptionState: SubscriptionState;
  subscriptionExpiresAt: string | null;

  verification: VerificationState;
  readOnly: true;
};
