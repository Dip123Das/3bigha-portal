import type {
  CapabilityKey,
  CapabilityResolution,
} from "../capability";

import type {
  SubscriptionAccessContext,
  SubscriptionAccessContextInput,
} from "../commercial";

import type {
  ThreeBOSAvailableAction,
  ThreeBOSRuntime,
  ThreeBOSRuntimeInput,
} from "../runtime";

export type ThreeBOSRuntimeContextStatus =
  | "uninitialized"
  | "ready"
  | "ambiguous";

export type ThreeBOSRuntimeReadinessState =
  | "idle"
  | "anonymous"
  | "needs_identity_confirmation"
  | "needs_workspace"
  | "operational"
  | "degraded";

export type ThreeBOSRuntimeReadinessReason =
  | "runtime_input_missing"
  | "authenticated_user_missing"
  | "identity_confirmation_required"
  | "identity_unresolved"
  | "workspace_unresolved"
  | "capabilities_unavailable"
  | "actions_unavailable";

export type ThreeBOSRuntimeReadiness = {
  state: ThreeBOSRuntimeReadinessState;
  operational: boolean;
  reasons: ThreeBOSRuntimeReadinessReason[];
  authenticated: boolean;
  hasIdentity: boolean;
  identityHumanConfirmed: boolean;
  hasWorkspace: boolean;
  hasGrowthPlan: boolean;
  capabilityCount: number;
  eligibleCapabilityCount: number;
  availableActionCount: number;
};

export type ThreeBOSRuntimeDiagnosticSeverity =
  | "info"
  | "warning"
  | "error";

export type ThreeBOSRuntimeDiagnosticMessage = {
  code: string;
  severity: ThreeBOSRuntimeDiagnosticSeverity;
  message: string;
};

export type ThreeBOSRuntimeDiagnostics = {
  identity: {
    selectedKey: string | null;
    selectedLabel: string | null;
    humanConfirmed: boolean;
    requiresHumanSelection: boolean;
    suggestionCount: number;
    suggestions: Array<{
      key: string;
      confidence: number | null;
    }>;
  };

  workspace: {
    primaryKey: string | null;
    primaryLabel: string | null;
    preferredWorkspaceKey: string | null;
    preferredWorkspaceMatched: boolean;
    availableCount: number;
    availableKeys: string[];
  };

  growthPlan: {
    legacyPlan: string | null;
    resolvedKey: string | null;
    resolvedLabel: string | null;
    isLegacyAlias: boolean;
    notes: string[];
  };

  capabilities: {
    total: number;
    eligible: number;
    usable: number;
    blockedByIdentity: number;
    blockedByPlan: number;
    items: Array<{
      capability: CapabilityKey;
      eligible: boolean;
      identityLevel: CapabilityResolution["identityLevel"];
      planLevel: CapabilityResolution["planLevel"];
      effectiveLevel: CapabilityResolution["effectiveLevel"];
      reason: string;
    }>;
  };

  actions: {
    total: number;
    workspaceCount: number;
    workspaceKeys: string[];
  };

  compatibility: {
    legacyRolePreserved: boolean;
    legacyPlanPreserved: boolean;
    routesPreserved: boolean;
    permissionsReplaced: boolean;
    databaseMutation: boolean;
  };

  health: {
    healthy: boolean;
    messages: ThreeBOSRuntimeDiagnosticMessage[];
  };
};

export type ThreeBOSWorkspaceActionProjection = {
  /**
   * Workspace selected as the human's current operating context.
   */
  primaryWorkspaceKey: string | null;
  primaryWorkspaceLabel: string | null;

  /**
   * Actions belonging to the current primary workspace.
   */
  primaryWorkspaceActions: ThreeBOSAvailableAction[];

  /**
   * Usable actions belonging to other resolved workspaces.
   */
  crossWorkspaceActions: ThreeBOSAvailableAction[];

  /**
   * Complete action collection retained for compatibility and inspection.
   */
  allAvailableActions: ThreeBOSAvailableAction[];

  /**
   * Actions grouped by workspace without changing their original order.
   */
  actionsByWorkspace: Record<string, ThreeBOSAvailableAction[]>;

  primaryActionCount: number;
  crossWorkspaceActionCount: number;
  totalActionCount: number;
};

export type ThreeBOSJourneySelectionSource =
  | "none"
  | "human";

export type ThreeBOSJourneyEntry = {
  /**
   * Stable bridge key combining workspace and navigation action.
   */
  key: string;
  actionKey: string;
  label: string;
  description: string;
  href: string;
  workspaceKey: string;
  workspaceLabel: string;
  capability: ThreeBOSAvailableAction["capability"];
  status: ThreeBOSAvailableAction["status"];

  /**
   * Original resolved action retained for capability and
   * entitlement inspection.
   */
  action: ThreeBOSAvailableAction;
};

export type ThreeBOSJourneyContext = {
  /**
   * Human-selected journey when one is currently active.
   */
  activeJourney: ThreeBOSJourneyEntry | null;
  activeJourneyKey: string | null;
  selectionSource: ThreeBOSJourneySelectionSource;

  /**
   * Journey entry points available in the active workspace.
   */
  primaryWorkspaceJourneys: ThreeBOSJourneyEntry[];

  /**
   * Journey entry points available from other workspaces.
   */
  crossWorkspaceJourneys: ThreeBOSJourneyEntry[];

  /**
   * Complete journey projection retained for discovery.
   */
  availableJourneys: ThreeBOSJourneyEntry[];

  journeyCount: number;
  hasActiveJourney: boolean;
};

export type ThreeBOSRuntimeContextValue = {
  /**
   * Current resolved runtime.
   *
   * It remains null until a page or bootstrap component supplies
   * authenticated compatibility signals.
   */
  runtime: ThreeBOSRuntime | null;

  /**
   * Compatibility inputs used to create the current runtime.
   */
  input: ThreeBOSRuntimeInput | null;

  /**
   * N-4A2 commercial context.
   *
   * Observe-only interpretation of existing subscription information.
   * It is not an authorization or payment source.
   */
  commercialContext: SubscriptionAccessContext | null;

  /**
   * Supply read-only commercial compatibility signals.
   */
  setCommercialContextInput: (
    input: SubscriptionAccessContextInput | null
  ) => void;

  /**
   * Context lifecycle state.
   *
   * uninitialized:
   * No compatibility signals have been supplied.
   *
   * ready:
   * A primary Human Identity was resolved or no identity decision
   * is presently required.
   *
   * ambiguous:
   * Signals produced possible identities but require human selection.
   */
  status: ThreeBOSRuntimeContextStatus;

  /**
   * Explainable runtime readiness.
   *
   * This supplements the legacy status field. It does not replace it.
   */
  readiness: ThreeBOSRuntimeReadiness;

  /**
   * Read-only explanation of how the current runtime was resolved.
   *
   * Diagnostics never grant access and never replace authoritative
   * authentication, permissions, subscriptions or database rules.
   */
  diagnostics: ThreeBOSRuntimeDiagnostics;

  /**
   * Supply or replace compatibility inputs.
   *
   * This does not write to the database.
   * This does not modify authentication.
   */
  setRuntimeInput: (
    input: ThreeBOSRuntimeInput | null
  ) => void;

  /**
   * Merge a partial compatibility update into the current input.
   */
  updateRuntimeInput: (
    input: Partial<ThreeBOSRuntimeInput>
  ) => void;

  /**
   * Clear the runtime, normally after logout or account change.
   */
  clearRuntime: () => void;

  /**
   * Read a resolved capability without repeating lookup logic.
   */
  getCapability: (
    capability: CapabilityKey
  ) => CapabilityResolution | null;

  /**
   * Check whether the current runtime includes a usable capability.
   */
  hasCapability: (
    capability: CapabilityKey
  ) => boolean;

  /**
   * Human actions already filtered by identity, workspace and plan.
   *
   * Retained as the original backward-compatible action collection.
   */
  availableActions: ThreeBOSAvailableAction[];

  /**
   * Human-first projection of available actions around the active workspace.
   */
  actionProjection: ThreeBOSWorkspaceActionProjection;

  /**
   * Convenience projection for the active workspace.
   */
  primaryWorkspaceActions: ThreeBOSAvailableAction[];

  /**
   * Usable actions resolved from other available workspaces.
   */
  crossWorkspaceActions: ThreeBOSAvailableAction[];

  /**
   * Read-only journey projection over already resolved actions.
   */
  journeyContext: ThreeBOSJourneyContext;

  /**
   * Select a journey entry point for the current runtime
   * session. This does not navigate or write to the database.
   */
  selectJourney: (journeyKey: string) => void;

  /**
   * Clear the current journey selection.
   */
  clearJourney: () => void;
};
