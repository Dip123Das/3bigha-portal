import {
  WORKSPACE_REGISTRY,
  getAvailableWorkspaceNavigation,
} from "./registry";

import type {
  WorkspaceCapabilityKey,
  WorkspaceDefinition,
  WorkspaceKey,
  WorkspaceLifecycleStatus,
  WorkspaceNavigationItem,
} from "./types";

export type WorkspaceCatalogEntry = {
  key: WorkspaceKey;
  label: string;
  shortLabel: string;
  description: string;
  status: WorkspaceLifecycleStatus;
  landingPath: string;

  identityCount: number;
  capabilityCount: number;
  navigationCount: number;
  availableNavigationCount: number;

  identities: WorkspaceDefinition["identities"];
  capabilities: WorkspaceCapabilityKey[];
  navigation: WorkspaceNavigationItem[];

  compatibility: {
    legacyRoles: string[];
    legacyModules: string[];
    legacyBusinessActivities: string[];
    hasLegacySignals: boolean;
  };

  operational: boolean;
};

export type WorkspaceRegistrySummary = {
  total: number;
  production: number;
  partial: number;
  compatibility: number;
  future: number;
  operational: number;
  withNavigation: number;
  withoutNavigation: number;
  keys: WorkspaceKey[];
};

const WORKSPACE_LIFECYCLE_ORDER: Record<
  WorkspaceLifecycleStatus,
  number
> = {
  production: 0,
  partial: 1,
  compatibility: 2,
  future: 3,
};

function createWorkspaceCatalogEntry(
  definition: WorkspaceDefinition
): WorkspaceCatalogEntry {
  const availableNavigation =
    getAvailableWorkspaceNavigation(definition.key);

  const legacyRoles =
    definition.legacyRoles ?? [];

  const legacyModules =
    definition.legacyModules ?? [];

  const legacyBusinessActivities =
    definition.legacyBusinessActivities ?? [];

  return {
    key: definition.key,
    label: definition.label,
    shortLabel: definition.shortLabel,
    description: definition.description,
    status: definition.status,
    landingPath: definition.landingPath,

    identityCount: definition.identities.length,
    capabilityCount: definition.capabilities.length,
    navigationCount: definition.navigation.length,
    availableNavigationCount:
      availableNavigation.length,

    identities: [...definition.identities],
    capabilities: [...definition.capabilities],
    navigation: [...availableNavigation],

    compatibility: {
      legacyRoles: [...legacyRoles],
      legacyModules: [...legacyModules],
      legacyBusinessActivities: [
        ...legacyBusinessActivities,
      ],
      hasLegacySignals:
        legacyRoles.length > 0 ||
        legacyModules.length > 0 ||
        legacyBusinessActivities.length > 0,
    },

    operational:
      definition.status === "production" ||
      definition.status === "partial",
  };
}

/**
 * Canonical read-only workspace catalog.
 *
 * The source of truth remains WORKSPACE_REGISTRY.
 * This catalog only derives presentation and diagnostic metadata.
 */
export const WORKSPACE_CATALOG: WorkspaceCatalogEntry[] =
  Object.values(WORKSPACE_REGISTRY)
    .map(createWorkspaceCatalogEntry)
    .sort((left, right) => {
      const lifecycleDifference =
        WORKSPACE_LIFECYCLE_ORDER[left.status] -
        WORKSPACE_LIFECYCLE_ORDER[right.status];

      if (lifecycleDifference !== 0) {
        return lifecycleDifference;
      }

      return left.label.localeCompare(right.label);
    });

const WORKSPACE_KEY_SET = new Set<WorkspaceKey>(
  WORKSPACE_CATALOG.map((workspace) => workspace.key)
);

export function isWorkspaceKey(
  value: string | null | undefined
): value is WorkspaceKey {
  return Boolean(
    value && WORKSPACE_KEY_SET.has(value as WorkspaceKey)
  );
}

export function getWorkspaceCatalogEntry(
  key: WorkspaceKey
): WorkspaceCatalogEntry {
  const workspace = WORKSPACE_CATALOG.find(
    (entry) => entry.key === key
  );

  if (!workspace) {
    throw new Error(
      `Workspace catalog entry not found: ${key}`
    );
  }

  return workspace;
}

export function findWorkspaceCatalogEntry(
  value: string | null | undefined
): WorkspaceCatalogEntry | null {
  if (!isWorkspaceKey(value)) {
    return null;
  }

  return getWorkspaceCatalogEntry(value);
}

export function getOperationalWorkspaceCatalog(): WorkspaceCatalogEntry[] {
  return WORKSPACE_CATALOG.filter(
    (workspace) => workspace.operational
  );
}

export function getWorkspaceCatalogByStatus(
  status: WorkspaceLifecycleStatus
): WorkspaceCatalogEntry[] {
  return WORKSPACE_CATALOG.filter(
    (workspace) => workspace.status === status
  );
}

export function getWorkspaceCatalogForCapability(
  capability: WorkspaceCapabilityKey
): WorkspaceCatalogEntry[] {
  return WORKSPACE_CATALOG.filter(
    (workspace) =>
      workspace.capabilities.includes(capability)
  );
}

export function getWorkspaceRegistrySummary(): WorkspaceRegistrySummary {
  const countByStatus = (
    status: WorkspaceLifecycleStatus
  ) =>
    WORKSPACE_CATALOG.filter(
      (workspace) => workspace.status === status
    ).length;

  return {
    total: WORKSPACE_CATALOG.length,
    production: countByStatus("production"),
    partial: countByStatus("partial"),
    compatibility: countByStatus(
      "compatibility"
    ),
    future: countByStatus("future"),
    operational: WORKSPACE_CATALOG.filter(
      (workspace) => workspace.operational
    ).length,
    withNavigation: WORKSPACE_CATALOG.filter(
      (workspace) =>
        workspace.availableNavigationCount > 0
    ).length,
    withoutNavigation: WORKSPACE_CATALOG.filter(
      (workspace) =>
        workspace.availableNavigationCount === 0
    ).length,
    keys: WORKSPACE_CATALOG.map(
      (workspace) => workspace.key
    ),
  };
}
