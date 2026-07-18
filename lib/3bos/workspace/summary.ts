import {
  findWorkspaceCatalogEntry,
  type WorkspaceCatalogEntry,
} from "./catalog";

import type {
  WorkspaceCapabilityKey,
  WorkspaceKey,
  WorkspaceLifecycleStatus,
  WorkspaceNavigationItem,
} from "./types";

export type WorkspaceSummaryHealth =
  | "healthy"
  | "attention"
  | "limited"
  | "unavailable";

export type WorkspaceSummaryMetricKey =
  | "pending_work"
  | "unread_conversations"
  | "open_requirements"
  | "active_projects"
  | "active_listings"
  | "recent_activity"
  | "alerts";

export type WorkspaceSummaryMetric = {
  key: WorkspaceSummaryMetricKey;
  label: string;
  value: number;
  href: string | null;
  attentionRequired: boolean;
};

export type WorkspaceSummaryAction = {
  key: string;
  label: string;
  description: string;
  href: string;
  capability: WorkspaceCapabilityKey;
  status: WorkspaceNavigationItem["status"];
  priority: number;
  reason:
    | "attention"
    | "continue_work"
    | "primary"
    | "discovery";
};

export type WorkspaceSummaryActivity = {
  id: string;
  label: string;
  description?: string | null;
  href?: string | null;
  occurredAt?: string | null;
  category?: string | null;
};

export type WorkspaceSummaryInput = {
  workspaceKey: WorkspaceKey | string | null;

  /**
   * Optional activity counts supplied by an existing dashboard,
   * server component, adapter or future workspace data service.
   */
  pendingWorkCount?: number | null;
  unreadConversationCount?: number | null;
  openRequirementCount?: number | null;
  activeProjectCount?: number | null;
  activeListingCount?: number | null;
  alertCount?: number | null;

  recentActivity?: WorkspaceSummaryActivity[] | null;

  /**
   * Navigation/action keys that the human recently used.
   */
  recentActionKeys?: string[] | null;

  /**
   * Navigation/action keys that require attention.
   */
  attentionActionKeys?: string[] | null;

  /**
   * Optional action limit for compact dashboard summaries.
   */
  recommendedActionLimit?: number | null;
};

export type WorkspaceSummary = {
  workspace: {
    key: WorkspaceKey | null;
    label: string;
    shortLabel: string;
    description: string;
    landingPath: string | null;
    lifecycleStatus: WorkspaceLifecycleStatus | null;
    operational: boolean;
  };

  health: {
    state: WorkspaceSummaryHealth;
    score: number;
    attentionRequired: boolean;
    reasons: string[];
  };

  metrics: WorkspaceSummaryMetric[];

  recommendedActions: WorkspaceSummaryAction[];

  recentActivity: WorkspaceSummaryActivity[];

  capabilityCount: number;
  availableActionCount: number;
  recentActivityCount: number;

  empty: boolean;
};

const EMPTY_SUMMARY: WorkspaceSummary = {
  workspace: {
    key: null,
    label: "Workspace unavailable",
    shortLabel: "Workspace",
    description:
      "A workspace has not yet been resolved for this session.",
    landingPath: null,
    lifecycleStatus: null,
    operational: false,
  },

  health: {
    state: "unavailable",
    score: 0,
    attentionRequired: true,
    reasons: ["workspace_unresolved"],
  },

  metrics: [],
  recommendedActions: [],
  recentActivity: [],
  capabilityCount: 0,
  availableActionCount: 0,
  recentActivityCount: 0,
  empty: true,
};

function normalizeCount(
  value: number | null | undefined
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function resolveMetricHref(
  workspace: WorkspaceCatalogEntry,
  navigationKeys: string[]
): string | null {
  for (const key of navigationKeys) {
    const item = workspace.navigation.find(
      (navigation) => navigation.key === key
    );

    if (item) {
      return item.href;
    }
  }

  return workspace.landingPath || null;
}

function resolveMetrics(
  workspace: WorkspaceCatalogEntry,
  input: WorkspaceSummaryInput
): WorkspaceSummaryMetric[] {
  const pendingWork =
    normalizeCount(input.pendingWorkCount);

  const unreadConversations =
    normalizeCount(input.unreadConversationCount);

  const openRequirements =
    normalizeCount(input.openRequirementCount);

  const activeProjects =
    normalizeCount(input.activeProjectCount);

  const activeListings =
    normalizeCount(input.activeListingCount);

  const alerts = normalizeCount(input.alertCount);

  const recentActivity =
    input.recentActivity?.length ?? 0;

  return [
    {
      key: "pending_work",
      label: "Pending work",
      value: pendingWork,
      href: workspace.landingPath,
      attentionRequired: pendingWork > 0,
    },
    {
      key: "unread_conversations",
      label: "Unread conversations",
      value: unreadConversations,
      href: resolveMetricHref(workspace, [
        "inbox",
        "messages",
        "conversations",
      ]),
      attentionRequired: unreadConversations > 0,
    },
    {
      key: "open_requirements",
      label: "Open requirements",
      value: openRequirements,
      href: resolveMetricHref(workspace, [
        "requirements",
        "rfqs",
        "buyer_requirements",
      ]),
      attentionRequired: openRequirements > 0,
    },
    {
      key: "active_projects",
      label: "Active projects",
      value: activeProjects,
      href: resolveMetricHref(workspace, [
        "projects",
        "construction_projects",
      ]),
      attentionRequired: false,
    },
    {
      key: "active_listings",
      label: "Active listings",
      value: activeListings,
      href: resolveMetricHref(workspace, [
        "materials",
        "my_materials",
        "my_services",
        "my_rentals",
        "my_properties",
      ]),
      attentionRequired: false,
    },
    {
      key: "recent_activity",
      label: "Recent activity",
      value: recentActivity,
      href: workspace.landingPath,
      attentionRequired: false,
    },
    {
      key: "alerts",
      label: "Alerts",
      value: alerts,
      href: workspace.landingPath,
      attentionRequired: alerts > 0,
    },
  ];
}

function resolveRecommendedActions(
  workspace: WorkspaceCatalogEntry,
  input: WorkspaceSummaryInput
): WorkspaceSummaryAction[] {
  const recentKeys = new Set(
    input.recentActionKeys ?? []
  );

  const attentionKeys = new Set(
    input.attentionActionKeys ?? []
  );

  const actions = workspace.navigation.map(
    (navigation, index): WorkspaceSummaryAction => {
      let priority = 100 - index;
      let reason: WorkspaceSummaryAction["reason"] =
        index === 0 ? "primary" : "discovery";

      if (recentKeys.has(navigation.key)) {
        priority += 100;
        reason = "continue_work";
      }

      if (attentionKeys.has(navigation.key)) {
        priority += 200;
        reason = "attention";
      }

      if (navigation.status === "production") {
        priority += 20;
      }

      if (navigation.status === "partial") {
        priority -= 10;
      }

      return {
        key: navigation.key,
        label: navigation.label,
        description: navigation.description,
        href: navigation.href,
        capability: navigation.capability,
        status: navigation.status,
        priority,
        reason,
      };
    }
  );

  const limit = Math.max(
    1,
    Math.min(
      normalizeCount(input.recommendedActionLimit) || 5,
      10
    )
  );

  return actions
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, limit);
}

function resolveHealth(
  workspace: WorkspaceCatalogEntry,
  metrics: WorkspaceSummaryMetric[]
): WorkspaceSummary["health"] {
  const reasons: string[] = [];

  if (!workspace.operational) {
    reasons.push("workspace_not_operational");
  }

  if (workspace.status === "partial") {
    reasons.push("workspace_partially_available");
  }

  if (workspace.status === "compatibility") {
    reasons.push("workspace_in_compatibility_mode");
  }

  if (workspace.availableNavigationCount === 0) {
    reasons.push("workspace_actions_unavailable");
  }

  const attentionMetricCount = metrics.filter(
    (metric) =>
      metric.attentionRequired && metric.value > 0
  ).length;

  if (attentionMetricCount > 0) {
    reasons.push("work_requires_attention");
  }

  let score = 100;

  if (!workspace.operational) {
    score -= 50;
  }

  if (workspace.status === "partial") {
    score -= 15;
  }

  if (workspace.status === "compatibility") {
    score -= 25;
  }

  if (workspace.availableNavigationCount === 0) {
    score -= 30;
  }

  score -= Math.min(attentionMetricCount * 5, 20);
  score = Math.max(0, score);

  let state: WorkspaceSummaryHealth = "healthy";

  if (!workspace.operational) {
    state =
      workspace.status === "future"
        ? "unavailable"
        : "limited";
  } else if (
    attentionMetricCount > 0 ||
    workspace.status === "partial"
  ) {
    state = "attention";
  }

  return {
    state,
    score,
    attentionRequired:
      state === "attention" ||
      state === "limited" ||
      state === "unavailable",
    reasons,
  };
}

/**
 * Build a human-first summary from the canonical workspace catalog
 * and optional activity signals supplied by existing applications.
 *
 * This resolver performs no database lookup, authorization decision,
 * route mutation or automatic AI action.
 */
export function resolveWorkspaceSummary(
  input: WorkspaceSummaryInput
): WorkspaceSummary {
  const workspace = findWorkspaceCatalogEntry(
    input.workspaceKey
  );

  if (!workspace) {
    return {
      ...EMPTY_SUMMARY,
      workspace: {
        ...EMPTY_SUMMARY.workspace,
      },
      health: {
        ...EMPTY_SUMMARY.health,
        reasons: [...EMPTY_SUMMARY.health.reasons],
      },
      metrics: [],
      recommendedActions: [],
      recentActivity: [],
    };
  }

  const recentActivity = [
    ...(input.recentActivity ?? []),
  ];

  const metrics = resolveMetrics(workspace, {
    ...input,
    recentActivity,
  });

  const recommendedActions =
    resolveRecommendedActions(workspace, input);

  const health = resolveHealth(
    workspace,
    metrics
  );

  const meaningfulMetricCount = metrics.filter(
    (metric) => metric.value > 0
  ).length;

  return {
    workspace: {
      key: workspace.key,
      label: workspace.label,
      shortLabel: workspace.shortLabel,
      description: workspace.description,
      landingPath: workspace.landingPath,
      lifecycleStatus: workspace.status,
      operational: workspace.operational,
    },

    health,
    metrics,
    recommendedActions,
    recentActivity,

    capabilityCount: workspace.capabilityCount,
    availableActionCount:
      workspace.availableNavigationCount,
    recentActivityCount: recentActivity.length,

    empty:
      meaningfulMetricCount === 0 &&
      recentActivity.length === 0,
  };
}
