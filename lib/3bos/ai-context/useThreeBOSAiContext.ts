"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import {
  use3BOSRuntime,
} from "@/lib/3bos/context/ThreeBOSRuntimeContext";

import {
  projectThreeBOSAiContext,
} from "./project";

import type {
  ThreeBOSAiContextProjection,
} from "./types";

/**
 * Client bridge between the live 3BOS runtime and the
 * normalized AI context projection engine.
 *
 * The hook is intentionally presentation-agnostic so that
 * GlobalAiCopilot and future AI surfaces can consume the same
 * business context.
 */
export function useThreeBOSAiContext():
  ThreeBOSAiContextProjection {
  const pathname = usePathname();
  const runtimeContext = use3BOSRuntime();

  return useMemo(() => {
    const runtime = runtimeContext.runtime;
    const actionProjection =
      runtimeContext.actionProjection;
    return projectThreeBOSAiContext({
      pathname,

      workspace: runtime?.workspaces.primary
        ? {
            key:
              runtime.workspaces.primary.key,
            title:
              runtime.workspaces.primary.label,
          }
        : null,

      journey: null,

      primaryActions:
        actionProjection?.primaryWorkspaceActions ??
        [],

      crossWorkspaceActions:
        actionProjection?.crossWorkspaceActions ??
        [],

      notifications: [],

      activity: [],
    });
  }, [
    pathname,
    runtimeContext.runtime,
    runtimeContext.actionProjection,
    runtimeContext.journeyContext,
  ]);
}
