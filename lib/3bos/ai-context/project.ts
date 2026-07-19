import {
  resolveThreeBOSAiPageContext,
} from "./page-context";

import type {
  ThreeBOSAiContextAction,
  ThreeBOSAiContextActivity,
  ThreeBOSAiContextAttentionItem,
  ThreeBOSAiContextInput,
  ThreeBOSAiContextProjection,
} from "./types";

const fallbackActions: ThreeBOSAiContextAction[] = [
  {
    id: "fallback-search",
    title: "Search the marketplace",
    description:
      "Search property, materials, services and rentals.",
    href: "/search",
    icon: "🔍",
    source: "fallback",
    priority: "normal",
  },
  {
    id: "fallback-rfq",
    title: "Create a requirement",
    description:
      "Describe what you need and receive vendor quotations.",
    href: "/rfq",
    icon: "📝",
    source: "fallback",
    priority: "normal",
  },
  {
    id: "fallback-support",
    title: "Get support",
    description:
      "Raise a guided support request.",
    href: "/support/new",
    icon: "🛡️",
    source: "fallback",
    priority: "low",
  },
];

function normalizePriority(
  value?: string | null
): ThreeBOSAiContextAction["priority"] {
  if (value === "urgent") return "urgent";
  if (value === "high") return "high";
  if (value === "low") return "low";
  return "normal";
}

function actionIdentity(
  value: {
    id?: string | null;
    key?: string | null;
    title?: string | null;
    label?: string | null;
    href?: string | null;
  },
  index: number
) {
  return (
    value.id ||
    value.key ||
    value.href ||
    value.title ||
    value.label ||
    `action-${index}`
  );
}

function normalizeActions(
  values:
    | ThreeBOSAiContextInput["primaryActions"]
    | ThreeBOSAiContextInput["crossWorkspaceActions"],
  source: ThreeBOSAiContextAction["source"]
): ThreeBOSAiContextAction[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.flatMap(
    (value, index): ThreeBOSAiContextAction[] => {
      const title =
        value.title?.trim() ||
        value.label?.trim();

      if (!title) {
        return [];
      }

      return [
        {
          id: actionIdentity(value, index),
          title,
          description:
            value.description?.trim() ||
            null,
          href:
            value.href?.trim() ||
            null,
          icon:
            value.icon?.trim() ||
            null,
          source,
          priority: normalizePriority(
            value.priority
          ),
        },
      ];
    }
  );
}

function normalizeNotificationAttention(
  input: ThreeBOSAiContextInput["notifications"]
): ThreeBOSAiContextAttentionItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter(
      (item) =>
        !item.dismissed &&
        item.status !== "read"
    )
    .map(
      (
        item,
        index
      ): ThreeBOSAiContextAttentionItem => ({
        id:
          item.id ||
          `notification-${index}`,
        title:
          item.title?.trim() ||
          "Notification",
        description:
          item.message?.trim() ||
          null,
        href:
          item.href?.trim() ||
          null,
        priority:
          item.priority === "urgent"
            ? "urgent"
            : item.priority === "high"
              ? "high"
              : "normal",
        source: "notification",
      })
    )
    .sort((left, right) => {
      const rank = {
        urgent: 3,
        high: 2,
        normal: 1,
      };

      return (
        rank[right.priority] -
        rank[left.priority]
      );
    });
}

function normalizeActivity(
  input: ThreeBOSAiContextInput["activity"]
): ThreeBOSAiContextActivity[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.flatMap(
    (
      item,
      index
    ): ThreeBOSAiContextActivity[] => {
      const title =
        item.title?.trim() ||
        item.message?.trim();

      if (!title) {
        return [];
      }

      const tone =
        item.tone === "success" ||
        item.tone === "warning" ||
        item.tone === "attention" ||
        item.tone === "information"
          ? item.tone
          : "neutral";

      return [
        {
          id:
            item.id ||
            `activity-${index}`,
          title,
          description:
            item.description?.trim() ||
            null,
          href:
            item.href?.trim() ||
            null,
          occurredAt:
            item.occurredAt ||
            item.createdAt ||
            null,
          tone,
        },
      ];
    }
  );
}

function uniqueActions(
  actions: ThreeBOSAiContextAction[]
) {
  const seen = new Set<string>();

  return actions.filter((action) => {
    const key =
      action.href ||
      action.id ||
      action.title;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildPromptContext(
  projection: Omit<
    ThreeBOSAiContextProjection,
    "assistant"
  >
) {
  const lines = [
    `Current area: ${projection.page.title}.`,
    `Runtime state: ${projection.readiness.state}.`,
  ];

  if (projection.workspace) {
    lines.push(
      `Active workspace: ${projection.workspace.title}.`
    );
  }

  if (projection.journey) {
    lines.push(
      `Selected journey: ${projection.journey.title}.`
    );
  }

  if (projection.attention.count > 0) {
    lines.push(
      `${projection.attention.count} item(s) currently require attention.`
    );
  }

  if (
    projection.actions.recommended.length > 0
  ) {
    lines.push(
      `Recommended next action: ${projection.actions.recommended[0].title}.`
    );
  }

  return lines.join(" ");
}

export function projectThreeBOSAiContext(
  input: ThreeBOSAiContextInput = {}
): ThreeBOSAiContextProjection {
  const limits = {
    recommendedActions:
      input.limits?.recommendedActions ??
      6,
    continueActions:
      input.limits?.continueActions ??
      3,
    attentionItems:
      input.limits?.attentionItems ??
      5,
    activityItems:
      input.limits?.activityItems ??
      5,
  };

  const page =
    resolveThreeBOSAiPageContext(
      input.pathname
    );

  const runtimeActions =
    normalizeActions(
      input.primaryActions,
      "runtime"
    );

  const crossWorkspaceActions =
    normalizeActions(
      input.crossWorkspaceActions,
      "workspace"
    );

  const attentionItems =
    normalizeNotificationAttention(
      input.notifications
    );

  const notificationActions =
    attentionItems
      .filter((item) => item.href)
      .map(
        (item): ThreeBOSAiContextAction => ({
          id: `attention-${item.id}`,
          title: item.title,
          description:
            item.description,
          href: item.href,
          icon:
            item.priority === "urgent"
              ? "🚨"
              : "🔔",
          source: "notification",
          priority: item.priority,
        })
      );

  const journeyActions:
    ThreeBOSAiContextAction[] =
    input.journey?.href
      ? [
          {
            id: `journey-${
              input.journey.key ||
              input.journey.href
            }`,
            title:
              input.journey.title ||
              "Continue journey",
            description:
              input.journey
                .description ||
              "Continue your selected work journey.",
            href:
              input.journey.href,
            icon: "▶️",
            source: "journey",
            priority: "high",
          },
        ]
      : [];

  const recommended =
    uniqueActions([
      ...notificationActions,
      ...journeyActions,
      ...runtimeActions,
      ...page.suggestedActions,
      ...crossWorkspaceActions,
      ...fallbackActions,
    ]).slice(
      0,
      limits.recommendedActions
    );

  const continueWork =
    uniqueActions([
      ...journeyActions,
      ...runtimeActions,
      ...page.suggestedActions,
    ]).slice(
      0,
      limits.continueActions
    );

  const readinessState =
    input.readinessState ||
    input.runtimeStatus ||
    "unknown";

  const authenticated =
    Boolean(input.authenticated);

  const operational =
    readinessState === "operational" ||
    input.runtimeStatus === "ready";

  const projectionBase: Omit<
    ThreeBOSAiContextProjection,
    "assistant"
  > = {
    version: "p03e-b-v1",
    generatedAt:
      new Date().toISOString(),

    readiness: {
      state: readinessState,
      operational,
      authenticated,
    },

    page,

    workspace: input.workspace
      ? {
          key:
            input.workspace.key ||
            null,
          title:
            input.workspace.title ||
            "Workspace",
          description:
            input.workspace
              .description ||
            null,
        }
      : null,

    journey: input.journey
      ? {
          key:
            input.journey.key ||
            null,
          title:
            input.journey.title ||
            "Active journey",
          description:
            input.journey
              .description ||
            null,
          href:
            input.journey.href ||
            null,
        }
      : null,

    attention: {
      count:
        attentionItems.length,
      urgentCount:
        attentionItems.filter(
          (item) =>
            item.priority === "urgent"
        ).length,
      items:
        attentionItems.slice(
          0,
          limits.attentionItems
        ),
    },

    actions: {
      recommended,
      continueWork,
      fallback:
        fallbackActions,
    },

    activity:
      normalizeActivity(
        input.activity
      ).slice(
        0,
        limits.activityItems
      ),
  };

  const promptContext =
    buildPromptContext(
      projectionBase
    );

  return {
    ...projectionBase,

    assistant: {
      heading:
        projectionBase.workspace
          ? `${projectionBase.workspace.title} Copilot`
          : "3Bigha Copilot",

      summary:
        projectionBase.attention
          .urgentCount > 0
          ? `${projectionBase.attention.urgentCount} urgent item(s) need attention.`
          : projectionBase.actions
                .recommended[0]
            ? `Recommended next: ${projectionBase.actions.recommended[0].title}.`
            : "Ready to help with your current work.",

      promptContext,
    },
  };
}
