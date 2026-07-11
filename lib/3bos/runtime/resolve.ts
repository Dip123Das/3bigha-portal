import {
  getPrimaryLegacyIdentitySuggestion,
  resolveLegacyIdentitySuggestions,
  type HumanIdentityDefinition,
  type LegacyIdentitySignals,
} from "../identity";

import {
  CAPABILITY_REGISTRY,
  getGrowthPlan,
  resolveCapabilityForIdentityAndPlan,
  resolveLegacyGrowthPlan,
  type CapabilityKey,
  type CapabilityResolution,
} from "../capability";

import {
  WORKSPACE_REGISTRY,
  type WorkspaceDefinition,
  type WorkspaceKey,
} from "../workspace";

import type {
  ThreeBOSAvailableAction,
  ThreeBOSRuntime,
  ThreeBOSRuntimeInput,
} from "./types";

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeList(
  values: Array<string | null | undefined> | null | undefined
): string[] {
  return Array.from(
    new Set((values ?? []).map(normalize).filter(Boolean))
  );
}

function resolveWorkspaces(input: {
  identity: HumanIdentityDefinition | null;
  signals: LegacyIdentitySignals;
}): WorkspaceDefinition[] {
  const role = normalize(input.signals.role);
  const modules = normalizeList(input.signals.moduleKeys);
  const activities = normalizeList(input.signals.natureOfBusiness);

  const resolved = Object.values(WORKSPACE_REGISTRY).filter((workspace) => {
    if (
      input.identity &&
      workspace.identities.includes(input.identity.key)
    ) {
      return true;
    }

    if (
      role &&
      (workspace.legacyRoles ?? []).map(normalize).includes(role)
    ) {
      return true;
    }

    if (
      modules.some((moduleKey) =>
        (workspace.legacyModules ?? [])
          .map(normalize)
          .includes(moduleKey)
      )
    ) {
      return true;
    }

    if (
      activities.some((activity) =>
        (workspace.legacyBusinessActivities ?? [])
          .map(normalize)
          .includes(activity)
      )
    ) {
      return true;
    }

    return false;
  });

  return resolved.sort((first, second) => {
    const statusOrder: Record<WorkspaceDefinition["status"], number> = {
      production: 1,
      partial: 2,
      compatibility: 3,
      future: 4,
    };

    const statusDifference =
      statusOrder[first.status] - statusOrder[second.status];

    if (statusDifference !== 0) return statusDifference;

    return first.label.localeCompare(second.label);
  });
}

function resolvePrimaryWorkspace(input: {
  workspaces: WorkspaceDefinition[];
  preferredWorkspaceKey?: string | null;
}): WorkspaceDefinition | null {
  const preferredKey = normalize(input.preferredWorkspaceKey);

  if (preferredKey) {
    const preferred = input.workspaces.find(
      (workspace) => workspace.key === preferredKey
    );

    if (preferred) return preferred;
  }

  const productionWorkspace = input.workspaces.find(
    (workspace) => workspace.status === "production"
  );

  return productionWorkspace ?? input.workspaces[0] ?? null;
}

function resolveCapabilities(input: {
  identity: HumanIdentityDefinition | null;
  growthPlan: ReturnType<typeof resolveLegacyGrowthPlan>["growthPlan"];
}): CapabilityResolution[] {
  if (!input.identity) return [];

  return (Object.keys(CAPABILITY_REGISTRY) as CapabilityKey[]).map(
    (capability) =>
      resolveCapabilityForIdentityAndPlan({
        identity: input.identity!.key,
        capability,
        plan: input.growthPlan,
      })
  );
}

function resolveAvailableActions(input: {
  workspaces: WorkspaceDefinition[];
  capabilities: CapabilityResolution[];
}): ThreeBOSAvailableAction[] {
  const capabilityMap = new Map(
    input.capabilities.map((resolution) => [
      resolution.capability,
      resolution,
    ])
  );

  const actions: ThreeBOSAvailableAction[] = [];

  for (const workspace of input.workspaces) {
    for (const navigationItem of workspace.navigation) {
      if (navigationItem.status === "future") continue;

      const capabilityResolution = capabilityMap.get(
        navigationItem.capability as CapabilityKey
      );

      if (!capabilityResolution) continue;
      if (!capabilityResolution.eligible) continue;
      if (capabilityResolution.effectiveLevel === "none") continue;

      actions.push({
        ...navigationItem,
        workspaceKey: workspace.key,
        workspaceLabel: workspace.shortLabel,
        capabilityResolution,
      });
    }
  }

  const seen = new Set<string>();

  return actions.filter((action) => {
    const deduplicationKey = `${action.href}:${action.key}`;

    if (seen.has(deduplicationKey)) return false;

    seen.add(deduplicationKey);
    return true;
  });
}

export function create3BOSRuntime(
  input: ThreeBOSRuntimeInput
): ThreeBOSRuntime {
  const identitySuggestions =
    resolveLegacyIdentitySuggestions(input);

  const primaryIdentitySuggestion =
    getPrimaryLegacyIdentitySuggestion(input);

  const primaryIdentity =
    primaryIdentitySuggestion?.identity ?? null;

  const availableWorkspaces = resolveWorkspaces({
    identity: primaryIdentity,
    signals: input,
  });

  const primaryWorkspace = resolvePrimaryWorkspace({
    workspaces: availableWorkspaces,
    preferredWorkspaceKey: input.preferredWorkspaceKey,
  });

  const growthPlanResolution =
    resolveLegacyGrowthPlan(input.legacyPlan);

  const growthPlanDefinition =
    getGrowthPlan(growthPlanResolution.growthPlan);

  const capabilities = resolveCapabilities({
    identity: primaryIdentity,
    growthPlan: growthPlanResolution.growthPlan,
  });

  const availableActions = resolveAvailableActions({
    workspaces: availableWorkspaces,
    capabilities,
  });

  return {
    version: "3bos-runtime-v1",
    userId: input.userId ?? null,
    input,

    identity: {
      primary: primaryIdentity,
      suggestions: identitySuggestions,
      requiresHumanSelection:
        identitySuggestions.length > 0 && primaryIdentity === null,
    },

    workspaces: {
      primary: primaryWorkspace,
      available: availableWorkspaces,
    },

    growthPlan: {
      resolution: growthPlanResolution,
      definition: growthPlanDefinition,
    },

    capabilities,
    availableActions,

    compatibility: {
      legacyRolePreserved: Boolean(normalize(input.role)),
      legacyPlanPreserved: Boolean(normalize(input.legacyPlan)),
      routesPreserved: true,
      permissionsReplaced: false,
      databaseMutation: false,
    },
  };
}

export function resolve3BOSRuntime(
  input: ThreeBOSRuntimeInput
): ThreeBOSRuntime {
  return create3BOSRuntime(input);
}

export function resolvePrimary3BOSWorkspace(
  input: ThreeBOSRuntimeInput
): WorkspaceDefinition | null {
  return create3BOSRuntime(input).workspaces.primary;
}

export function resolve3BOSAvailableActions(
  input: ThreeBOSRuntimeInput
): ThreeBOSAvailableAction[] {
  return create3BOSRuntime(input).availableActions;
}

export function has3BOSCapability(
  runtime: ThreeBOSRuntime,
  capability: CapabilityKey
): boolean {
  const resolution = runtime.capabilities.find(
    (item) => item.capability === capability
  );

  return Boolean(
    resolution?.eligible &&
      resolution.effectiveLevel !== "none"
  );
}

export function get3BOSWorkspaceByKey(
  key: WorkspaceKey
): WorkspaceDefinition {
  return WORKSPACE_REGISTRY[key];
}
