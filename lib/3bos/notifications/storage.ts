import type {
  WorkspaceNotification,
  WorkspaceNotificationStatus,
} from "./types";

const STORAGE_KEY =
  "3bigha_3bos_workspace_notifications_v1";

const UPDATE_EVENT =
  "3bos-workspace-notifications-updated";

const MAX_NOTIFICATIONS = 100;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getStoredWorkspaceNotifications():
  WorkspaceNotification[] {
  if (!isBrowser()) return [];

  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (
          item
        ): item is WorkspaceNotification =>
          Boolean(
            item &&
            typeof item.id === "string" &&
            typeof item.eventId === "string" &&
            typeof item.title === "string"
          )
      )
      .slice(
        0,
        MAX_NOTIFICATIONS
      );
  } catch {
    return [];
  }
}

export function saveWorkspaceNotifications(
  notifications: WorkspaceNotification[]
): WorkspaceNotification[] {
  if (!isBrowser()) {
    return notifications;
  }

  try {
    const existing =
      getStoredWorkspaceNotifications();

    const existingStatus =
      new Map(
        existing.map((item) => [
          item.id,
          item.status,
        ])
      );

    const merged =
      Array.from(
        new Map(
          [
            ...notifications.map(
              (item) => ({
                ...item,
                status:
                  existingStatus.get(
                    item.id
                  ) ??
                  item.status,
              })
            ),
            ...existing,
          ].map((item) => [
            item.id,
            item,
          ])
        ).values()
      )
        .sort(
          (a, b) =>
            new Date(
              b.occurredAt
            ).getTime() -
            new Date(
              a.occurredAt
            ).getTime()
        )
        .slice(
          0,
          MAX_NOTIFICATIONS
        );

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(merged)
    );

    window.dispatchEvent(
      new CustomEvent(
        UPDATE_EVENT
      )
    );

    return merged;
  } catch {
    return notifications;
  }
}

export function setWorkspaceNotificationStatus(
  id: string,
  status: WorkspaceNotificationStatus
): WorkspaceNotification[] {
  const notifications =
    getStoredWorkspaceNotifications();

  const next =
    notifications.map((item) =>
      item.id === id
        ? {
            ...item,
            status,
          }
        : item
    );

  saveWorkspaceNotifications(next);

  return next;
}

export function markWorkspaceNotificationRead(
  id: string
): WorkspaceNotification[] {
  return setWorkspaceNotificationStatus(
    id,
    "read"
  );
}

export function dismissWorkspaceNotification(
  id: string
): WorkspaceNotification[] {
  return setWorkspaceNotificationStatus(
    id,
    "dismissed"
  );
}

export function markAllWorkspaceNotificationsRead():
  WorkspaceNotification[] {
  const notifications =
    getStoredWorkspaceNotifications();

  const next =
    notifications.map((item) => ({
      ...item,
      status:
        item.status === "dismissed"
          ? item.status
          : "read" as const,
    }));

  saveWorkspaceNotifications(next);

  return next;
}

export function clearWorkspaceNotifications():
  void {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(
      STORAGE_KEY
    );

    window.dispatchEvent(
      new CustomEvent(
        UPDATE_EVENT
      )
    );
  } catch {
    // Notification storage must not block UI.
  }
}

export const THREE_BOS_NOTIFICATION_UPDATE =
  UPDATE_EVENT;
