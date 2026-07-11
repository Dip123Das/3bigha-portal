import type {
  HumanIdentityDefinition,
  IdentitySuggestion,
  LegacyIdentitySignals,
} from "../identity";

import type {
  CapabilityKey,
  CapabilityResolution,
  GrowthPlanDefinition,
  LegacyPlanResolution,
} from "../capability";

import type {
  WorkspaceDefinition,
  WorkspaceNavigationItem,
} from "../workspace";

export type ThreeBOSRuntimeInput = LegacyIdentitySignals & {
  userId?: string | null;
  legacyPlan?: string | null;
  preferredWorkspaceKey?: string | null;
};

export type ThreeBOSAvailableAction = WorkspaceNavigationItem & {
  workspaceKey: WorkspaceDefinition["key"];
  workspaceLabel: string;
  capabilityResolution: CapabilityResolution;
};

export type ThreeBOSRuntime = {
  /**
   * Runtime schema version.
   * This allows future extension without replacing existing consumers.
   */
  version: "3bos-runtime-v1";

  /**
   * Existing user id is carried only as context.
   * The runtime performs no user or database lookup.
   */
  userId: string | null;

  /**
   * Original compatibility inputs are retained for auditability.
   */
  input: ThreeBOSRuntimeInput;

  identity: {
    primary: HumanIdentityDefinition | null;
    suggestions: IdentitySuggestion[];
    requiresHumanSelection: boolean;
  };

  workspaces: {
    primary: WorkspaceDefinition | null;
    available: WorkspaceDefinition[];
  };

  growthPlan: {
    resolution: LegacyPlanResolution;
    definition: GrowthPlanDefinition;
  };

  capabilities: CapabilityResolution[];

  availableActions: ThreeBOSAvailableAction[];

  compatibility: {
    legacyRolePreserved: boolean;
    legacyPlanPreserved: boolean;
    routesPreserved: true;
    permissionsReplaced: false;
    databaseMutation: false;
  };
};
