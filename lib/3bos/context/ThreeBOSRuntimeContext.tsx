"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  CapabilityKey,
  CapabilityResolution,
} from "../capability";

import {
  resolveSubscriptionAccessContext,
  type SubscriptionAccessContext,
  type SubscriptionAccessContextInput,
} from "../commercial";

import {
  create3BOSRuntime,
  has3BOSCapability,
  type ThreeBOSAvailableAction,
  type ThreeBOSRuntime,
  type ThreeBOSRuntimeInput,
} from "../runtime";

import type {
  ThreeBOSRuntimeContextStatus,
  ThreeBOSRuntimeContextValue,
  ThreeBOSJourneyContext,
  ThreeBOSJourneyEntry,
  ThreeBOSRuntimeDiagnostics,
  ThreeBOSRuntimeReadiness,
  ThreeBOSWorkspaceActionProjection,
  ThreeBOSRuntimeReadinessReason,
} from "./types";

const ThreeBOSRuntimeContext =
  createContext<ThreeBOSRuntimeContextValue | null>(null);

export type ThreeBOSRuntimeProviderProps = {
  children: ReactNode;

  /**
   * Optional initial input.
   *
   * Global integration will later supply this from the existing
   * authenticated profile flow. It is intentionally optional now.
   */
  initialInput?: ThreeBOSRuntimeInput | null;
};

function resolveRuntimeStatus(
  runtime: ThreeBOSRuntime | null
): ThreeBOSRuntimeContextStatus {
  if (!runtime) return "uninitialized";

  if (runtime.identity.requiresHumanSelection) {
    return "ambiguous";
  }

  return "ready";
}

function resolveRuntimeReadiness(
  input: ThreeBOSRuntimeInput | null,
  runtime: ThreeBOSRuntime | null
): ThreeBOSRuntimeReadiness {
  const reasons: ThreeBOSRuntimeReadinessReason[] = [];

  if (!input) {
    reasons.push("runtime_input_missing");

    return {
      state: "idle",
      operational: false,
      reasons,
      authenticated: false,
      hasIdentity: false,
      identityHumanConfirmed: false,
      hasWorkspace: false,
      hasGrowthPlan: false,
      capabilityCount: 0,
      eligibleCapabilityCount: 0,
      availableActionCount: 0,
    };
  }

  const authenticated = Boolean(runtime?.userId);
  const hasIdentity = Boolean(runtime?.identity.primary);
  const identityHumanConfirmed =
    Boolean(runtime?.identity.humanConfirmed);
  const hasWorkspace =
    Boolean(runtime?.workspaces.primary);
  const hasGrowthPlan =
    Boolean(runtime?.growthPlan.definition);

  const capabilityCount =
    runtime?.capabilities.length ?? 0;

  const eligibleCapabilityCount =
    runtime?.capabilities.filter(
      (capability) =>
        capability.eligible &&
        capability.effectiveLevel !== "none"
    ).length ?? 0;

  const availableActionCount =
    runtime?.availableActions.length ?? 0;

  if (!authenticated) {
    reasons.push("authenticated_user_missing");
  }

  if (runtime?.identity.requiresHumanSelection) {
    reasons.push("identity_confirmation_required");
  } else if (!hasIdentity) {
    reasons.push("identity_unresolved");
  }

  if (hasIdentity && !hasWorkspace) {
    reasons.push("workspace_unresolved");
  }

  if (hasIdentity && capabilityCount === 0) {
    reasons.push("capabilities_unavailable");
  }

  if (
    hasIdentity &&
    hasWorkspace &&
    availableActionCount === 0
  ) {
    reasons.push("actions_unavailable");
  }

  let state: ThreeBOSRuntimeReadiness["state"];

  if (runtime?.identity.requiresHumanSelection) {
    state = "needs_identity_confirmation";
  } else if (hasIdentity && !hasWorkspace) {
    state = "needs_workspace";
  } else if (
    hasIdentity &&
    hasWorkspace &&
    hasGrowthPlan
  ) {
    state =
      reasons.length === 0 ||
      (
        reasons.length === 1 &&
        reasons[0] === "authenticated_user_missing"
      )
        ? "operational"
        : "degraded";
  } else if (!authenticated && !hasIdentity) {
    state = "anonymous";
  } else {
    state = "degraded";
  }

  return {
    state,
    operational: state === "operational",
    reasons,
    authenticated,
    hasIdentity,
    identityHumanConfirmed,
    hasWorkspace,
    hasGrowthPlan,
    capabilityCount,
    eligibleCapabilityCount,
    availableActionCount,
  };
}

function resolveRuntimeDiagnostics(
  input: ThreeBOSRuntimeInput | null,
  runtime: ThreeBOSRuntime | null,
  readiness: ThreeBOSRuntimeReadiness
): ThreeBOSRuntimeDiagnostics {
  const messages: ThreeBOSRuntimeDiagnostics["health"]["messages"] = [];

  if (!input) {
    messages.push({
      code: "runtime_input_missing",
      severity: "info",
      message:
        "Runtime compatibility signals have not yet been supplied.",
    });
  }

  if (
    runtime?.identity.requiresHumanSelection
  ) {
    messages.push({
      code: "identity_confirmation_required",
      severity: "warning",
      message:
        "Multiple possible identities were detected and human confirmation is required.",
    });
  }

  if (
    runtime &&
    runtime.identity.primary &&
    !runtime.workspaces.primary
  ) {
    messages.push({
      code: "workspace_unresolved",
      severity: "warning",
      message:
        "An identity was resolved, but no primary workspace could be selected.",
    });
  }

  const blockedByIdentity =
    runtime?.capabilities.filter(
      (capability) =>
        capability.identityLevel === "none"
    ).length ?? 0;

  const blockedByPlan =
    runtime?.capabilities.filter(
      (capability) =>
        capability.identityLevel !== "none" &&
        capability.planLevel === "none"
    ).length ?? 0;

  const usableCapabilities =
    runtime?.capabilities.filter(
      (capability) =>
        capability.eligible &&
        capability.effectiveLevel !== "none"
    ).length ?? 0;

  if (
    runtime &&
    runtime.identity.primary &&
    usableCapabilities === 0
  ) {
    messages.push({
      code: "no_usable_capabilities",
      severity: "warning",
      message:
        "The resolved identity currently has no usable capabilities.",
    });
  }

  const actionWorkspaceKeys = Array.from(
    new Set(
      runtime?.availableActions.map(
        (action) => action.workspaceKey
      ) ?? []
    )
  );

  return {
    identity: {
      selectedKey:
        runtime?.identity.primary?.key ?? null,
      selectedLabel:
        runtime?.identity.primary?.label ?? null,
      humanConfirmed:
        runtime?.identity.humanConfirmed ?? false,
      requiresHumanSelection:
        runtime?.identity.requiresHumanSelection ?? false,
      suggestionCount:
        runtime?.identity.suggestions.length ?? 0,
      suggestions:
        runtime?.identity.suggestions.map(
          (suggestion) => ({
            key: suggestion.identity.key,
            confidence: null,
          })
        ) ?? [],
    },

    workspace: {
      primaryKey:
        runtime?.workspaces.primary?.key ?? null,
      primaryLabel:
        runtime?.workspaces.primary?.label ?? null,
      preferredWorkspaceKey:
        input?.preferredWorkspaceKey ?? null,
      preferredWorkspaceMatched:
        Boolean(
          input?.preferredWorkspaceKey &&
          runtime?.workspaces.primary?.key ===
            input.preferredWorkspaceKey
        ),
      availableCount:
        runtime?.workspaces.available.length ?? 0,
      availableKeys:
        runtime?.workspaces.available.map(
          (workspace) => workspace.key
        ) ?? [],
    },

    growthPlan: {
      legacyPlan:
        input?.legacyPlan ?? null,
      resolvedKey:
        runtime?.growthPlan.definition.key ?? null,
      resolvedLabel:
        runtime?.growthPlan.definition.label ?? null,
      isLegacyAlias:
        runtime?.growthPlan.resolution.isLegacyAlias ??
        false,
      notes:
        runtime?.growthPlan.resolution.notes ?? [],
    },

    capabilities: {
      total:
        runtime?.capabilities.length ?? 0,
      eligible:
        runtime?.capabilities.filter(
          (capability) => capability.eligible
        ).length ?? 0,
      usable: usableCapabilities,
      blockedByIdentity,
      blockedByPlan,
      items:
        runtime?.capabilities.map(
          (capability) => ({
            capability: capability.capability,
            eligible: capability.eligible,
            identityLevel:
              capability.identityLevel,
            planLevel:
              capability.planLevel,
            effectiveLevel:
              capability.effectiveLevel,
            reason: capability.reason,
          })
        ) ?? [],
    },

    actions: {
      total:
        runtime?.availableActions.length ?? 0,
      workspaceCount:
        actionWorkspaceKeys.length,
      workspaceKeys:
        actionWorkspaceKeys,
    },

    compatibility: {
      legacyRolePreserved:
        runtime?.compatibility
          .legacyRolePreserved ?? true,
      legacyPlanPreserved:
        runtime?.compatibility
          .legacyPlanPreserved ?? true,
      routesPreserved:
        runtime?.compatibility.routesPreserved ??
        true,
      permissionsReplaced:
        runtime?.compatibility
          .permissionsReplaced ?? false,
      databaseMutation:
        runtime?.compatibility.databaseMutation ??
        false,
    },

    health: {
      healthy:
        readiness.operational &&
        !messages.some(
          (message) =>
            message.severity === "error"
        ),
      messages,
    },
  };
}

function resolveWorkspaceActionProjection(
  runtime: ThreeBOSRuntime | null
): ThreeBOSWorkspaceActionProjection {
  const allAvailableActions =
    runtime?.availableActions ?? [];

  const primaryWorkspaceKey =
    runtime?.workspaces.primary?.key ?? null;

  const primaryWorkspaceLabel =
    runtime?.workspaces.primary?.label ?? null;

  const primaryWorkspaceActions =
    primaryWorkspaceKey
      ? allAvailableActions.filter(
          (action) =>
            action.workspaceKey ===
            primaryWorkspaceKey
        )
      : [];

  const crossWorkspaceActions =
    primaryWorkspaceKey
      ? allAvailableActions.filter(
          (action) =>
            action.workspaceKey !==
            primaryWorkspaceKey
        )
      : allAvailableActions;

  const actionsByWorkspace =
    allAvailableActions.reduce<
      Record<string, ThreeBOSAvailableAction[]>
    >((groups, action) => {
      const workspaceKey = action.workspaceKey;

      if (!groups[workspaceKey]) {
        groups[workspaceKey] = [];
      }

      groups[workspaceKey].push(action);
      return groups;
    }, {});

  return {
    primaryWorkspaceKey,
    primaryWorkspaceLabel,
    primaryWorkspaceActions,
    crossWorkspaceActions,
    allAvailableActions,
    actionsByWorkspace,
    primaryActionCount:
      primaryWorkspaceActions.length,
    crossWorkspaceActionCount:
      crossWorkspaceActions.length,
    totalActionCount:
      allAvailableActions.length,
  };
}

function createJourneyEntry(
  action: ThreeBOSAvailableAction
): ThreeBOSJourneyEntry {
  return {
    key: `${action.workspaceKey}:${action.key}`,
    actionKey: action.key,
    label: action.label,
    description: action.description,
    href: action.href,
    workspaceKey: action.workspaceKey,
    workspaceLabel: action.workspaceLabel,
    capability: action.capability,
    status: action.status,
    action,
  };
}

function resolveJourneyContext(
  actionProjection: ThreeBOSWorkspaceActionProjection,
  selectedJourneyKey: string | null
): ThreeBOSJourneyContext {
  const primaryWorkspaceJourneys =
    actionProjection.primaryWorkspaceActions.map(
      createJourneyEntry
    );

  const crossWorkspaceJourneys =
    actionProjection.crossWorkspaceActions.map(
      createJourneyEntry
    );

  const availableJourneys = [
    ...primaryWorkspaceJourneys,
    ...crossWorkspaceJourneys,
  ];

  const activeJourney =
    selectedJourneyKey
      ? availableJourneys.find(
          (journey) =>
            journey.key === selectedJourneyKey
        ) ?? null
      : null;

  return {
    activeJourney,
    activeJourneyKey:
      activeJourney?.key ?? null,
    selectionSource:
      activeJourney ? "human" : "none",
    primaryWorkspaceJourneys,
    crossWorkspaceJourneys,
    availableJourneys,
    journeyCount: availableJourneys.length,
    hasActiveJourney: activeJourney !== null,
  };
}

export function ThreeBOSRuntimeProvider({
  children,
  initialInput = null,
}: ThreeBOSRuntimeProviderProps) {
  const [input, setInput] =
    useState<ThreeBOSRuntimeInput | null>(initialInput);

  const [
    selectedJourneyKey,
    setSelectedJourneyKey,
  ] = useState<string | null>(null);

  const [
    commercialInput,
    setCommercialInput,
  ] = useState<SubscriptionAccessContextInput | null>(
    null
  );

  const runtime = useMemo<ThreeBOSRuntime | null>(() => {
    if (!input) return null;

    return create3BOSRuntime(input);
  }, [input]);

  const commercialContext =
    useMemo<SubscriptionAccessContext | null>(() => {
      if (!commercialInput) return null;

      return resolveSubscriptionAccessContext({
        ...commercialInput,
        humanId:
          runtime?.userId ??
          commercialInput.humanId ??
          null,
        identityKey:
          runtime?.identity.primary?.key ??
          commercialInput.identityKey ??
          null,
        workspaceKey:
          runtime?.workspaces.primary?.key ??
          commercialInput.workspaceKey ??
          null,
      });
    }, [commercialInput, runtime]);

  const readiness =
    useMemo<ThreeBOSRuntimeReadiness>(
      () => resolveRuntimeReadiness(input, runtime),
      [input, runtime]
    );

  const diagnostics =
    useMemo<ThreeBOSRuntimeDiagnostics>(
      () =>
        resolveRuntimeDiagnostics(
          input,
          runtime,
          readiness
        ),
      [input, runtime, readiness]
    );

  const actionProjection =
    useMemo<ThreeBOSWorkspaceActionProjection>(
      () =>
        resolveWorkspaceActionProjection(runtime),
      [runtime]
    );

  const journeyContext =
    useMemo<ThreeBOSJourneyContext>(
      () =>
        resolveJourneyContext(
          actionProjection,
          selectedJourneyKey
        ),
      [actionProjection, selectedJourneyKey]
    );

  const selectJourney = useCallback(
    (journeyKey: string) => {
      setSelectedJourneyKey(journeyKey);
    },
    []
  );

  const clearJourney = useCallback(() => {
    setSelectedJourneyKey(null);
  }, []);

  const setCommercialContextInput = useCallback(
    (
      nextInput:
        | SubscriptionAccessContextInput
        | null
    ) => {
      setCommercialInput(nextInput);
    },
    []
  );

  const setRuntimeInput = useCallback(
    (nextInput: ThreeBOSRuntimeInput | null) => {
      setInput(nextInput);
    },
    []
  );

  const updateRuntimeInput = useCallback(
    (partialInput: Partial<ThreeBOSRuntimeInput>) => {
      setInput((currentInput) => ({
        ...(currentInput ?? {}),
        ...partialInput,
      }));
    },
    []
  );

  const clearRuntime = useCallback(() => {
    setInput(null);
    setCommercialInput(null);
    setSelectedJourneyKey(null);
  }, []);

  const getCapability = useCallback(
    (
      capability: CapabilityKey
    ): CapabilityResolution | null => {
      if (!runtime) return null;

      return (
        runtime.capabilities.find(
          (resolution) =>
            resolution.capability === capability
        ) ?? null
      );
    },
    [runtime]
  );

  const hasCapability = useCallback(
    (capability: CapabilityKey): boolean => {
      if (!runtime) return false;

      return has3BOSCapability(runtime, capability);
    },
    [runtime]
  );

  const value = useMemo<ThreeBOSRuntimeContextValue>(
    () => ({
      runtime,
      input,
      commercialContext,
      status: resolveRuntimeStatus(runtime),
      readiness,
      diagnostics,
      actionProjection,
      primaryWorkspaceActions:
        actionProjection.primaryWorkspaceActions,
      crossWorkspaceActions:
        actionProjection.crossWorkspaceActions,
      journeyContext,
      selectJourney,
      clearJourney,
      setCommercialContextInput,
      setRuntimeInput,
      updateRuntimeInput,
      clearRuntime,
      getCapability,
      hasCapability,
      availableActions:
        runtime?.availableActions ?? [],
    }),
    [
      runtime,
      input,
      commercialContext,
      readiness,
      diagnostics,
      actionProjection,
      journeyContext,
      selectJourney,
      clearJourney,
      setCommercialContextInput,
      setRuntimeInput,
      updateRuntimeInput,
      clearRuntime,
      getCapability,
      hasCapability,
    ]
  );

  return (
    <ThreeBOSRuntimeContext.Provider value={value}>
      {children}
    </ThreeBOSRuntimeContext.Provider>
  );
}

/**
 * Strict hook for components that must be inside the provider.
 */
export function use3BOSRuntime(): ThreeBOSRuntimeContextValue {
  const context = useContext(ThreeBOSRuntimeContext);

  if (!context) {
    throw new Error(
      "use3BOSRuntime must be used inside ThreeBOSRuntimeProvider."
    );
  }

  return context;
}

/**
 * Optional hook for compatibility migration.
 *
 * Existing pages can use this without failing when the global provider
 * has not yet been mounted.
 */
export function useOptional3BOSRuntime():
  | ThreeBOSRuntimeContextValue
  | null {
  return useContext(ThreeBOSRuntimeContext);
}
