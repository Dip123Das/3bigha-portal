import type {
  ThreeBOSEvent,
} from "@/lib/3bos/events";

import {
  DEFAULT_WORKSPACE_NOTIFICATION_RULES,
} from "./rules";

import type {
  WorkspaceNotification,
  WorkspaceNotificationPriority,
  WorkspaceNotificationProjection,
  WorkspaceNotificationRule,
} from "./types";

const PRIORITY_WEIGHT: Record<
  WorkspaceNotificationPriority,
  number
> = {
  low: 1,
  normal: 2,
  high: 3,
  urgent: 4,
};

function notificationIdentity(
  event: ThreeBOSEvent
): string {
  return `notification:${event.id}`;
}

function createNotification(
  event: ThreeBOSEvent,
  rules: WorkspaceNotificationRule[],
  now: Date
): WorkspaceNotification {
  for (const rule of rules) {
    const matched = rule({
      event,
      now,
    });

    if (!matched) {
      continue;
    }

    return {
      id: notificationIdentity(event),
      eventId: event.id,

      kind: matched.kind,
      priority: matched.priority,
      status: "unread",

      title:
        matched.title ||
        event.title,

      message:
        matched.message ||
        event.description ||
        "Workspace activity recorded.",

      source: event.source,
      href: event.href ?? null,

      workspaceKey:
        event.workspace?.key ?? null,

      subjectType:
        event.subject?.type ?? null,

      subjectId:
        event.subject?.id ?? null,

      occurredAt: event.occurredAt,
      createdAt: now.toISOString(),

      actionLabel:
        matched.actionLabel ?? null,

      metadata: {
        eventType: event.type,
        visibility:
          event.visibility,
        eventTone:
          event.tone,
        ...(event.metadata ?? {}),
      },
    };
  }

  throw new Error(
    "Workspace notification rules must include a fallback rule."
  );
}

function deduplicateNotifications(
  notifications: WorkspaceNotification[]
): WorkspaceNotification[] {
  return Array.from(
    new Map(
      notifications.map(
        (notification) => [
          notification.id,
          notification,
        ]
      )
    ).values()
  );
}

function sortNotifications(
  notifications: WorkspaceNotification[]
): WorkspaceNotification[] {
  return [...notifications].sort(
    (a, b) => {
      const priorityDifference =
        PRIORITY_WEIGHT[b.priority] -
        PRIORITY_WEIGHT[a.priority];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (
        new Date(b.occurredAt).getTime() -
        new Date(a.occurredAt).getTime()
      );
    }
  );
}

export function projectWorkspaceNotifications(
  events:
    | ThreeBOSEvent[]
    | null
    | undefined,
  options?: {
    now?: Date;
    limit?: number;
    rules?: WorkspaceNotificationRule[];
  }
): WorkspaceNotificationProjection {
  const now =
    options?.now ?? new Date();

  const rules =
    options?.rules ??
    DEFAULT_WORKSPACE_NOTIFICATION_RULES;

  const projected =
    (events ?? []).map((event) =>
      createNotification(
        event,
        rules,
        now
      )
    );

  const sorted =
    sortNotifications(
      deduplicateNotifications(projected)
    );

  const notifications =
    typeof options?.limit === "number"
      ? sorted.slice(
          0,
          Math.max(
            0,
            Math.floor(options.limit)
          )
        )
      : sorted;

  const unread =
    notifications.filter(
      (item) =>
        item.status === "unread"
    );

  const urgent =
    notifications.filter(
      (item) =>
        item.priority === "urgent"
    );

  const actionRequired =
    notifications.filter(
      (item) =>
        item.kind === "action_required"
    );

  const awaitingResponse =
    notifications.filter(
      (item) =>
        item.kind === "awaiting_response"
    );

  const deadlines =
    notifications.filter(
      (item) =>
        item.kind === "deadline"
    );

  const successes =
    notifications.filter(
      (item) =>
        item.kind === "success"
    );

  const warnings =
    notifications.filter(
      (item) =>
        item.kind === "warning"
    );

  const information =
    notifications.filter(
      (item) =>
        item.kind === "information"
    );

  return {
    notifications,

    unread,
    urgent,
    actionRequired,
    awaitingResponse,
    deadlines,
    successes,
    warnings,
    information,

    total:
      notifications.length,

    unreadCount:
      unread.length,

    urgentCount:
      urgent.length,

    actionRequiredCount:
      actionRequired.length,

    highestPriority:
      notifications[0]?.priority ??
      null,

    latest:
      [...notifications].sort(
        (a, b) =>
          new Date(
            b.occurredAt
          ).getTime() -
          new Date(
            a.occurredAt
          ).getTime()
      )[0] ?? null,
  };
}
