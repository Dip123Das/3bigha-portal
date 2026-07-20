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
  type CapabilityLevel,
  type CapabilityResolution,
} from "../capability";

import {
  HUB_VENDOR_BUSINESS_WORKSPACE_KEYS,
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

const CAPABILITY_LEVEL_ORDER: readonly CapabilityLevel[] = [
  "none",
  "basic",
  "limited",
  "standard",
  "full",
  "advanced",
  "priority",
  "executive",
  "unlimited",
  "enterprise",
];

function higherCapabilityResolution(
  current: CapabilityResolution | null,
  candidate: CapabilityResolution
): CapabilityResolution | null {
  if (!candidate.eligible || candidate.effectiveLevel === "none") {
    return current;
  }

  if (!current) return candidate;

  return CAPABILITY_LEVEL_ORDER.indexOf(candidate.effectiveLevel) >
    CAPABILITY_LEVEL_ORDER.indexOf(current.effectiveLevel)
    ? candidate
    : current;
}

function higherIdentityRelevance(
  current: CapabilityResolution | null,
  candidate: CapabilityResolution
): CapabilityResolution | null {
  if (candidate.identityLevel === "none") return current;
  if (!current) return candidate;

  return CAPABILITY_LEVEL_ORDER.indexOf(candidate.identityLevel) >
    CAPABILITY_LEVEL_ORDER.indexOf(current.identityLevel)
    ? candidate
    : current;
}

function resolveWorkspaces(input: {
  identity: HumanIdentityDefinition | null;
  signals: LegacyIdentitySignals;
}): WorkspaceDefinition[] {
  const role = normalize(input.signals.role);
  const modules = normalizeList(input.signals.moduleKeys);
  const activities = normalizeList(input.signals.natureOfBusiness);
  const isHubVendor = role === "hub_vendor";

  const resolved = Object.values(WORKSPACE_REGISTRY).filter((workspace) => {
    if (
      isHubVendor &&
      HUB_VENDOR_BUSINESS_WORKSPACE_KEYS.includes(workspace.key)
    ) {
      return true;
    }

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
  activeIdentity?: HumanIdentityDefinition | null;
}): WorkspaceDefinition | null {
  const preferredKey = normalize(input.preferredWorkspaceKey);

  if (input.activeIdentity) {
    const identityWorkspaces = input.workspaces.filter(
      (workspace) =>
        workspace.status !== "future" &&
        workspace.identities.includes(
          input.activeIdentity!.key
        )
    );

    if (preferredKey) {
      const preferredIdentityWorkspace =
        identityWorkspaces.find(
          (workspace) => workspace.key === preferredKey
        );

      if (preferredIdentityWorkspace) {
        return preferredIdentityWorkspace;
      }
    }

    const productionIdentityWorkspace =
      identityWorkspaces.find(
        (workspace) => workspace.status === "production"
      );

    if (productionIdentityWorkspace) {
      return productionIdentityWorkspace;
    }

    if (identityWorkspaces[0]) {
      return identityWorkspaces[0];
    }
  }

  /*
   * A preferred workspace is a human choice only when it is paired with a
   * currently valid, human-confirmed identity. Stale session preferences must
   * never override the workspace implied by the resolved identity.
   */

  const productionWorkspace = input.workspaces.find(
    (workspace) => workspace.status === "production"
  );

  return productionWorkspace ?? input.workspaces[0] ?? null;
}

function resolveCapabilities(input: {
  identity: HumanIdentityDefinition | null;
  growthPlan: ReturnType<typeof resolveLegacyGrowthPlan>["growthPlan"];
  workspaces: WorkspaceDefinition[];
  aggregateWorkspaceIdentities?: boolean;
  preserveHubScaleCompatibility?: boolean;
}): CapabilityResolution[] {
  if (!input.identity) return [];

  return (Object.keys(CAPABILITY_REGISTRY) as CapabilityKey[]).map((capability) => {
    const primaryResolution = resolveCapabilityForIdentityAndPlan({
        identity: input.identity!.key,
        capability,
        plan: input.growthPlan,
      });

    if (!input.aggregateWorkspaceIdentities) return primaryResolution;

    const relevantIdentities = Array.from(
      new Set(input.workspaces.flatMap((workspace) => workspace.identities))
    );

    const workspaceResolutions = relevantIdentities.map((identity) =>
        resolveCapabilityForIdentityAndPlan({
          identity,
          capability,
          plan: input.growthPlan,
        })
      );

    const eligibleResolution = workspaceResolutions.reduce<CapabilityResolution | null>(
        higherCapabilityResolution,
        null
      );

    if (eligibleResolution) return eligibleResolution;

    const workspaceRelevance = workspaceResolutions.reduce<CapabilityResolution | null>(
      higherIdentityRelevance,
      null
    );

    if (input.preserveHubScaleCompatibility && workspaceRelevance) {
      return {
        ...workspaceRelevance,
        eligible: true,
        planLevel: workspaceRelevance.identityLevel,
        effectiveLevel: workspaceRelevance.identityLevel,
        reason:
          "Existing hub-vendor Scale segment route remains visible; route permissions and verification remain authoritative.",
      };
    }

    return primaryResolution;
  });
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

  const activeIdentityKey = normalize(
    input.activeIdentityKey
  );

  const humanConfirmedIdentity =
    identitySuggestions.find(
      (suggestion) =>
        suggestion.identity.key === activeIdentityKey &&
        suggestion.identity.status !== "future" &&
        Object.values(WORKSPACE_REGISTRY).some(
          (workspace) =>
            workspace.status !== "future" &&
            workspace.identities.includes(
              suggestion.identity.key
            )
        )
    )?.identity ?? null;

  const primaryIdentity =
    humanConfirmedIdentity ??
    primaryIdentitySuggestion?.identity ??
    null;

  const availableWorkspaces = resolveWorkspaces({
    identity: primaryIdentity,
    signals: input,
  });

  const primaryWorkspace =
    normalize(input.role) === "hub_vendor"
      ? availableWorkspaces.find(
          (workspace) => workspace.key === "multi_business"
        ) ??
        resolvePrimaryWorkspace({
          workspaces: availableWorkspaces,
          activeIdentity: primaryIdentity,
        })
      : resolvePrimaryWorkspace({
          workspaces: availableWorkspaces,
          preferredWorkspaceKey: humanConfirmedIdentity
            ? input.preferredWorkspaceKey
            : null,
          /*
           * The identity displayed to the human and the workspace displayed
           * beside it must come from the same resolution. A confirmed identity
           * may honour its saved preference; an inferred identity uses its
           * canonical workspace.
           */
          activeIdentity: primaryIdentity,
        });

  const growthPlanResolution =
    resolveLegacyGrowthPlan(input.legacyPlan);

  const growthPlanDefinition =
    getGrowthPlan(growthPlanResolution.growthPlan);

  const capabilities = resolveCapabilities({
    identity: primaryIdentity,
    growthPlan: growthPlanResolution.growthPlan,
    workspaces: availableWorkspaces,
    aggregateWorkspaceIdentities:
      normalize(input.role) === "hub_vendor",
    preserveHubScaleCompatibility:
      normalize(input.role) === "hub_vendor" &&
      growthPlanResolution.growthPlan === "scale",
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
      humanConfirmed: Boolean(humanConfirmedIdentity),
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
