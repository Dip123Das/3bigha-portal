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
