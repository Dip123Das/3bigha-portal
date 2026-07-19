"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  THREE_BOS_EVENT_BUS_UPDATE,
} from "@/lib/3bos/events";

import {
  dismissWorkspaceNotification,
  getStoredWorkspaceNotifications,
  markAllWorkspaceNotificationsRead,
  markWorkspaceNotificationRead,
  projectStoredNotifications,
  resolveWorkspaceNotifications,
  THREE_BOS_NOTIFICATION_UPDATE,
  type WorkspaceNotification,
  type WorkspaceNotificationKind,
  type WorkspaceNotificationPriority,
} from "@/lib/3bos/notifications";

import styles from "./workspace-notifications.module.css";

export type WorkspaceNotificationCenterProps = {
  workspaceKey?: string | null;
  limit?: number;
};

const KIND_LABELS: Record<
  WorkspaceNotificationKind,
  string
> = {
  action_required: "Action required",
  awaiting_response: "Awaiting response",
  deadline: "Deadline",
  success: "Completed",
  warning: "Warning",
  information: "Update",
};

const KIND_ICONS: Record<
  WorkspaceNotificationKind,
  string
> = {
  action_required: "!",
  awaiting_response: "↩",
  deadline: "◷",
  success: "✓",
  warning: "!",
  information: "i",
};

function formatRelativeTime(
  value: string
): string {
  const timestamp =
    new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const difference =
    Math.max(
      0,
      Date.now() - timestamp
    );

  const minutes =
    Math.floor(
      difference / 60000
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `${days} day${
      days === 1 ? "" : "s"
    } ago`;
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      day: "numeric",
      month: "short",
    }
  ).format(
    new Date(timestamp)
  );
}

function priorityClass(
  priority: WorkspaceNotificationPriority
): string {
  if (priority === "urgent") {
    return styles.priorityUrgent;
  }

  if (priority === "high") {
    return styles.priorityHigh;
  }

  if (priority === "normal") {
    return styles.priorityNormal;
  }

  return styles.priorityLow;
}

function notificationClass(
  item: WorkspaceNotification
): string {
  return [
    styles.notificationItem,
    item.status === "unread"
      ? styles.notificationUnread
      : "",
    priorityClass(item.priority),
  ]
    .filter(Boolean)
    .join(" ");
}

function WorkspaceNotificationItem({
  notification,
  onRead,
  onDismiss,
}: {
  notification: WorkspaceNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const mainContent = (
    <>
      <span
        className={styles.notificationIcon}
        aria-hidden="true"
      >
        {KIND_ICONS[notification.kind]}
      </span>

      <div className={styles.notificationBody}>
        <div className={styles.notificationTopline}>
          <span className={styles.notificationKind}>
            {KIND_LABELS[notification.kind]}
          </span>

          <span className={styles.notificationTime}>
            {formatRelativeTime(
              notification.occurredAt
            )}
          </span>
        </div>

        <div className={styles.notificationTitle}>
          {notification.title}
        </div>

        <p className={styles.notificationMessage}>
          {notification.message}
        </p>

        <div className={styles.notificationMeta}>
          <span>
            {notification.source}
          </span>

          <span>
            {notification.priority}
          </span>

          {notification.status === "unread" ? (
            <span className={styles.unreadLabel}>
              New
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <article
      className={notificationClass(
        notification
      )}
    >
      {notification.href ? (
        <Link
          href={notification.href}
          className={styles.notificationMain}
          onClick={() =>
            onRead(notification.id)
          }
        >
          {mainContent}
        </Link>
      ) : (
        <div className={styles.notificationMain}>
          {mainContent}
        </div>
      )}

      <div className={styles.notificationActions}>
        {notification.href ? (
          <Link
            href={notification.href}
            className={styles.primaryAction}
            onClick={() =>
              onRead(notification.id)
            }
          >
            {notification.actionLabel ||
              "Open"}
          </Link>
        ) : null}

        {notification.status === "unread" ? (
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={() =>
              onRead(notification.id)
            }
          >
            Mark read
          </button>
        ) : null}

        <button
          type="button"
          className={styles.dismissAction}
          onClick={() =>
            onDismiss(notification.id)
          }
          aria-label={`Dismiss ${notification.title}`}
        >
          Dismiss
        </button>
      </div>
    </article>
  );
}

export function WorkspaceNotificationCenter({
  workspaceKey,
  limit = 6,
}: WorkspaceNotificationCenterProps) {
  const [
    notifications,
    setNotifications,
  ] = useState<WorkspaceNotification[]>(
    []
  );

  const synchronizeStoredNotifications =
    useCallback(() => {
      setNotifications(
        getStoredWorkspaceNotifications()
      );
    }, []);

  const projectNotifications =
    useCallback(() => {
      resolveWorkspaceNotifications({
        workspaceKey:
          workspaceKey ?? null,
        eventLimit: 100,
        notificationLimit: 30,
        persist: true,
      });

      synchronizeStoredNotifications();
    }, [
      workspaceKey,
      synchronizeStoredNotifications,
    ]);

  useEffect(() => {
    projectNotifications();

    const handleEventUpdate = () => {
      projectNotifications();
    };

    const handleNotificationUpdate = () => {
      synchronizeStoredNotifications();
    };

    const handleStorageUpdate = () => {
      synchronizeStoredNotifications();
    };

    window.addEventListener(
      THREE_BOS_EVENT_BUS_UPDATE,
      handleEventUpdate
    );

    window.addEventListener(
      THREE_BOS_NOTIFICATION_UPDATE,
      handleNotificationUpdate
    );

    window.addEventListener(
      "storage",
      handleStorageUpdate
    );

    return () => {
      window.removeEventListener(
        THREE_BOS_EVENT_BUS_UPDATE,
        handleEventUpdate
      );

      window.removeEventListener(
        THREE_BOS_NOTIFICATION_UPDATE,
        handleNotificationUpdate
      );

      window.removeEventListener(
        "storage",
        handleStorageUpdate
      );
    };
  }, [
    projectNotifications,
    synchronizeStoredNotifications,
  ]);

  const projection = useMemo(
    () =>
      projectStoredNotifications(
        notifications
      ),
    [notifications]
  );

  const visible =
    projection.notifications.slice(
      0,
      Math.max(
        1,
        Math.floor(limit)
      )
    );

  const handleRead = useCallback(
    (id: string) => {
      setNotifications(
        markWorkspaceNotificationRead(id)
      );
    },
    []
  );

  const handleDismiss = useCallback(
    (id: string) => {
      setNotifications(
        dismissWorkspaceNotification(id)
      );
    },
    []
  );

  const handleMarkAllRead =
    useCallback(() => {
      setNotifications(
        markAllWorkspaceNotificationsRead()
      );
    }, []);

  if (visible.length === 0) {
    return null;
  }

  return (
    <section className={styles.notificationCenter}>
      <div className={styles.notificationHeader}>
        <div>
          <div className={styles.eyebrow}>
            Smart attention
          </div>

          <h2 className={styles.title}>
            What needs your attention
          </h2>

          <p className={styles.description}>
            Important work, replies and deadlines
            identified from your workspace activity.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.notificationCounts}>
            <span>
              <strong>
                {projection.unreadCount}
              </strong>
              Unread
            </span>

            <span>
              <strong>
                {projection.urgentCount}
              </strong>
              Urgent
            </span>

            <span>
              <strong>
                {
                  projection.actionRequiredCount
                }
              </strong>
              Actions
            </span>
          </div>

          {projection.unreadCount > 0 ? (
            <button
              type="button"
              className={styles.markAllButton}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.notificationList}>
        {visible.map((notification) => (
          <WorkspaceNotificationItem
            key={notification.id}
            notification={notification}
            onRead={handleRead}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </section>
  );
}

export default WorkspaceNotificationCenter;
