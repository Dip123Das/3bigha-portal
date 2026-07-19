import type {
  WorkspaceNotificationRule,
  WorkspaceNotificationRuleResult,
} from "./types";

function searchableText(
  title: string,
  description?: string | null,
  type?: string | null
): string {
  return [
    title,
    description ?? "",
    type ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function includesAny(
  value: string,
  words: string[]
): boolean {
  return words.some((word) =>
    value.includes(word)
  );
}

function result(
  value: WorkspaceNotificationRuleResult
): WorkspaceNotificationRuleResult {
  return value;
}

export const dangerRule: WorkspaceNotificationRule =
  ({ event }) => {
    const text = searchableText(
      event.title,
      event.description,
      event.type
    );

    const dangerWords = [
      "failed",
      "failure",
      "rejected",
      "declined",
      "cancelled",
      "canceled",
      "overdue",
      "blocked",
      "error",
      "expired",
      "payment failed",
    ];

    if (
      event.tone !== "danger" &&
      !includesAny(text, dangerWords)
    ) {
      return null;
    }

    return result({
      kind: "warning",
      priority: "urgent",
      title: event.title,
      message:
        event.description ||
        "This activity requires immediate attention.",
      actionLabel: event.href
        ? "Review now"
        : null,
    });
  };

export const warningRule: WorkspaceNotificationRule =
  ({ event }) => {
    const text = searchableText(
      event.title,
      event.description,
      event.type
    );

    const warningWords = [
      "warning",
      "risk",
      "delayed",
      "delay",
      "issue",
      "problem",
      "missing",
      "incomplete",
      "attention",
    ];

    if (
      event.tone !== "warning" &&
      !includesAny(text, warningWords)
    ) {
      return null;
    }

    return result({
      kind: "warning",
      priority: "high",
      title: event.title,
      message:
        event.description ||
        "Review this workspace warning.",
      actionLabel: event.href
        ? "Review"
        : null,
    });
  };

export const deadlineRule: WorkspaceNotificationRule =
  ({ event }) => {
    const text = searchableText(
      event.title,
      event.description,
      event.type
    );

    const deadlineWords = [
      "deadline",
      "due today",
      "due tomorrow",
      "due soon",
      "needed by",
      "expiring",
      "expires",
      "urgent",
    ];

    if (!includesAny(text, deadlineWords)) {
      return null;
    }

    return result({
      kind: "deadline",
      priority: includesAny(text, [
        "due today",
        "urgent",
        "expiring today",
      ])
        ? "urgent"
        : "high",
      title: event.title,
      message:
        event.description ||
        "A workspace deadline is approaching.",
      actionLabel: event.href
        ? "Open task"
        : null,
    });
  };

export const awaitingResponseRule: WorkspaceNotificationRule =
  ({ event }) => {
    const text = searchableText(
      event.title,
      event.description,
      event.type
    );

    const awaitingWords = [
      "awaiting response",
      "waiting for response",
      "reply received",
      "message received",
      "vendor replied",
      "buyer replied",
      "new message",
      "new enquiry",
      "enquiry received",
      "quote received",
      "quotation received",
    ];

    if (!includesAny(text, awaitingWords)) {
      return null;
    }

    return result({
      kind: "awaiting_response",
      priority: "high",
      title: event.title,
      message:
        event.description ||
        "A participant is waiting for your response.",
      actionLabel: event.href
        ? "Respond"
        : null,
    });
  };

export const actionRequiredRule: WorkspaceNotificationRule =
  ({ event }) => {
    const text = searchableText(
      event.title,
      event.description,
      event.type
    );

    const actionWords = [
      "action required",
      "requires approval",
      "approval required",
      "review required",
      "complete profile",
      "submit document",
      "needs attention",
      "pending decision",
      "pending acceptance",
      "ready for review",
      "quotation available",
      "quotes available",
    ];

    if (
      event.tone !== "attention" &&
      !includesAny(text, actionWords)
    ) {
      return null;
    }

    return result({
      kind: "action_required",
      priority: "high",
      title: event.title,
      message:
        event.description ||
        "This workspace activity needs your action.",
      actionLabel: event.href
        ? "Take action"
        : null,
    });
  };

export const successRule: WorkspaceNotificationRule =
  ({ event }) => {
    const text = searchableText(
      event.title,
      event.description,
      event.type
    );

    const successWords = [
      "accepted",
      "approved",
      "completed",
      "delivered",
      "paid",
      "published",
      "resolved",
      "successful",
      "success",
      "closed",
    ];

    if (
      event.tone !== "success" &&
      !includesAny(text, successWords)
    ) {
      return null;
    }

    return result({
      kind: "success",
      priority: "normal",
      title: event.title,
      message:
        event.description ||
        "This activity was completed successfully.",
      actionLabel: event.href
        ? "View"
        : null,
    });
  };

export const informationRule: WorkspaceNotificationRule =
  ({ event }) => ({
    kind: "information",
    priority: "low",
    title: event.title,
    message:
      event.description ||
      "A new workspace activity was recorded.",
    actionLabel: event.href
      ? "Open"
      : null,
  });

export const DEFAULT_WORKSPACE_NOTIFICATION_RULES: WorkspaceNotificationRule[] =
  [
    dangerRule,
    deadlineRule,
    warningRule,
    awaitingResponseRule,
    actionRequiredRule,
    successRule,
    informationRule,
  ];
