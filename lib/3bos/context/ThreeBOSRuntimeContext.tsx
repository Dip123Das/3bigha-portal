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
  type ThreeBOSRuntime,
  type ThreeBOSRuntimeInput,
} from "../runtime";

import type {
  ThreeBOSRuntimeContextStatus,
  ThreeBOSRuntimeContextValue,
  ThreeBOSRuntimeReadiness,
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

export function ThreeBOSRuntimeProvider({
  children,
  initialInput = null,
}: ThreeBOSRuntimeProviderProps) {
  const [input, setInput] =
    useState<ThreeBOSRuntimeInput | null>(initialInput);

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
