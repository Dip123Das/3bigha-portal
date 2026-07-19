import {
  getThreeBOSEvents,
} from "@/lib/3bos/events";

import {
  projectWorkspaceNotifications,
} from "./project";

import {
  saveWorkspaceNotifications,
} from "./storage";

import type {
  WorkspaceNotification,
  WorkspaceNotificationProjection,
} from "./types";

export function resolveWorkspaceNotifications(
  options?: {
    workspaceKey?: string | null;
    eventLimit?: number;
    notificationLimit?: number;
    persist?: boolean;
  }
): WorkspaceNotificationProjection {
  const events =
    getThreeBOSEvents({
      workspaceKey:
        options?.workspaceKey ??
        null,

      limit:
        options?.eventLimit ??
        100,
    });

  const projection =
    projectWorkspaceNotifications(
      events,
      {
        limit:
          options?.notificationLimit ??
          30,
      }
    );

  if (options?.persist !== false) {
    const saved =
      saveWorkspaceNotifications(
        projection.notifications
      );

    return projectStoredNotifications(
      saved
    );
  }

  return projection;
}

export function projectStoredNotifications(
  notifications:
    | WorkspaceNotification[]
    | null
    | undefined
): WorkspaceNotificationProjection {
  const items =
    notifications ?? [];

  const visible =
    items.filter(
      (item) =>
        item.status !== "dismissed"
    );

  const unread =
    visible.filter(
      (item) =>
        item.status === "unread"
    );

  const urgent =
    visible.filter(
      (item) =>
        item.priority === "urgent"
    );

  const actionRequired =
    visible.filter(
      (item) =>
        item.kind ===
        "action_required"
    );

  const awaitingResponse =
    visible.filter(
      (item) =>
        item.kind ===
        "awaiting_response"
    );

  const deadlines =
    visible.filter(
      (item) =>
        item.kind === "deadline"
    );

  const successes =
    visible.filter(
      (item) =>
        item.kind === "success"
    );

  const warnings =
    visible.filter(
      (item) =>
        item.kind === "warning"
    );

  const information =
    visible.filter(
      (item) =>
        item.kind ===
        "information"
    );

  const priorityWeight = {
    low: 1,
    normal: 2,
    high: 3,
    urgent: 4,
  } as const;

  const ordered =
    [...visible].sort(
      (a, b) =>
        priorityWeight[b.priority] -
          priorityWeight[a.priority] ||
        new Date(
          b.occurredAt
        ).getTime() -
          new Date(
            a.occurredAt
          ).getTime()
    );

  return {
    notifications: ordered,

    unread,
    urgent,
    actionRequired,
    awaitingResponse,
    deadlines,
    successes,
    warnings,
    information,

    total:
      visible.length,

    unreadCount:
      unread.length,

    urgentCount:
      urgent.length,

    actionRequiredCount:
      actionRequired.length,

    highestPriority:
      ordered[0]?.priority ??
      null,

    latest:
      [...visible].sort(
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
