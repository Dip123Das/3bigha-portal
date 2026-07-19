"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

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
} from "@/lib/3bos/notifications";

import styles from "./GlobalNotificationBell.module.css";

export default function GlobalNotificationBell({
  className = "",
  label = "Alerts",
}: {
  className?: string;
  label?: string;
}) {
  const supabase = useMemo(
    () => getSupabaseBrowser(),
    []
  );

  const rootRef =
    useRef<HTMLDivElement | null>(null);

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    vendorCount,
    setVendorCount,
  ] = useState(0);

  const [
    smartNotifications,
    setSmartNotifications,
  ] = useState<
    WorkspaceNotification[]
  >([]);

  const synchronizeStoredNotifications =
    useCallback(() => {
      setSmartNotifications(
        getStoredWorkspaceNotifications()
      );
    }, []);

  const projectSmartNotifications =
    useCallback(() => {
      resolveWorkspaceNotifications({
        eventLimit: 100,
        notificationLimit: 40,
        persist: true,
      });

      synchronizeStoredNotifications();
    }, [synchronizeStoredNotifications]);

  const loadVendorCount =
    useCallback(async () => {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        const userId =
          session?.user?.id;

        if (!userId) {
          setAuthenticated(false);
          setVendorCount(0);
          return;
        }

        setAuthenticated(true);

        const {
          count: unreadCount,
          error,
        } = await supabase
          .from("vendor_notifications")
          .select(
            "id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "user_id",
            userId
          )
          .eq(
            "is_read",
            false
          );

        if (error) {
          setVendorCount(0);
          return;
        }

        setVendorCount(
          unreadCount || 0
        );
      } catch {
        setAuthenticated(false);
        setVendorCount(0);
      }
    }, [supabase]);

  useEffect(() => {
    void loadVendorCount();

    projectSmartNotifications();

    const vendorTimer =
      window.setInterval(() => {
        void loadVendorCount();
      }, 30000);

    const smartTimer =
      window.setInterval(() => {
        projectSmartNotifications();
      }, 60000);

    const handleEventBusUpdate = () => {
      projectSmartNotifications();
    };

    const handleNotificationUpdate = () => {
      synchronizeStoredNotifications();
    };

    const handleStorageUpdate = () => {
      synchronizeStoredNotifications();
    };

    window.addEventListener(
      THREE_BOS_EVENT_BUS_UPDATE,
      handleEventBusUpdate
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
      window.clearInterval(
        vendorTimer
      );

      window.clearInterval(
        smartTimer
      );

      window.removeEventListener(
        THREE_BOS_EVENT_BUS_UPDATE,
        handleEventBusUpdate
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
    loadVendorCount,
    projectSmartNotifications,
    synchronizeStoredNotifications,
  ]);

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent
    ) {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape"
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  const projection = useMemo(
    () =>
      projectStoredNotifications(
        smartNotifications
      ),
    [smartNotifications]
  );

  const visibleNotifications =
    projection.notifications.slice(
      0,
      5
    );

  const combinedUnreadCount =
    vendorCount +
    projection.unreadCount;

  const displayCount =
    combinedUnreadCount > 99
      ? "99+"
      : String(
          combinedUnreadCount
        );

  const handleMarkRead =
    useCallback(
      (id: string) => {
        setSmartNotifications(
          markWorkspaceNotificationRead(
            id
          )
        );
      },
      []
    );

  const handleDismiss =
    useCallback(
      (id: string) => {
        setSmartNotifications(
          dismissWorkspaceNotification(
            id
          )
        );
      },
      []
    );

  const handleMarkAllRead =
    useCallback(() => {
      setSmartNotifications(
        markAllWorkspaceNotificationsRead()
      );
    }, []);

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${className}`}
    >
      <button
        type="button"
        className={styles.trigger}
        title="Open notifications"
        aria-label={`Open notifications${
          combinedUnreadCount > 0
            ? `, ${combinedUnreadCount} unread`
            : ""
        }`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() =>
          setIsOpen(
            (current) =>
              !current
          )
        }
      >
        <span
          className={styles.bell}
          aria-hidden="true"
        >
          🔔
        </span>

        <span className={styles.label}>
          {label}
        </span>

        {combinedUnreadCount > 0 ? (
          <span
            className={styles.badge}
          >
            {displayCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className={styles.panel}
          role="dialog"
          aria-label="Notifications"
        >
          <div
            className={
              styles.panelHeader
            }
          >
            <div>
              <div
                className={
                  styles.eyebrow
                }
              >
                3BOS attention
              </div>

              <h2
                className={
                  styles.panelTitle
                }
              >
                Notifications
              </h2>
            </div>

            {projection.unreadCount >
            0 ? (
              <button
                type="button"
                className={
                  styles.markAllButton
                }
                onClick={
                  handleMarkAllRead
                }
              >
                Mark smart alerts read
              </button>
            ) : null}
          </div>

          <div
            className={
              styles.summary
            }
          >
            <span>
              <strong>
                {
                  projection.unreadCount
                }
              </strong>
              Smart
            </span>

            <span>
              <strong>
                {vendorCount}
              </strong>
              Stored
            </span>

            <span>
              <strong>
                {
                  projection.urgentCount
                }
              </strong>
              Urgent
            </span>
          </div>

          {visibleNotifications.length >
          0 ? (
            <div
              className={
                styles.notificationList
              }
            >
              {visibleNotifications.map(
                (notification) => (
                  <article
                    key={
                      notification.id
                    }
                    className={`${styles.notificationItem} ${
                      notification.status ===
                      "unread"
                        ? styles.unread
                        : ""
                    }`}
                  >
                    <div
                      className={
                        styles.notificationContent
                      }
                    >
                      <div
                        className={
                          styles.notificationTopline
                        }
                      >
                        <span
                          className={
                            styles.notificationKind
                          }
                        >
                          {
                            notification.kind
                              .replaceAll(
                                "_",
                                " "
                              )
                          }
                        </span>

                        <span
                          className={
                            styles.priority
                          }
                          data-priority={
                            notification.priority
                          }
                        >
                          {
                            notification.priority
                          }
                        </span>
                      </div>

                      <div
                        className={
                          styles.notificationTitle
                        }
                      >
                        {
                          notification.title
                        }
                      </div>

                      <p
                        className={
                          styles.notificationMessage
                        }
                      >
                        {
                          notification.message
                        }
                      </p>
                    </div>

                    <div
                      className={
                        styles.notificationActions
                      }
                    >
                      {notification.href ? (
                        <Link
                          href={
                            notification.href
                          }
                          className={
                            styles.openAction
                          }
                          onClick={() => {
                            handleMarkRead(
                              notification.id
                            );

                            setIsOpen(
                              false
                            );
                          }}
                        >
                          {notification.actionLabel ||
                            "Open"}
                        </Link>
                      ) : null}

                      {notification.status ===
                      "unread" ? (
                        <button
                          type="button"
                          className={
                            styles.textAction
                          }
                          onClick={() =>
                            handleMarkRead(
                              notification.id
                            )
                          }
                        >
                          Read
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className={
                          styles.dismissAction
                        }
                        onClick={() =>
                          handleDismiss(
                            notification.id
                          )
                        }
                      >
                        Dismiss
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          ) : (
            <div
              className={
                styles.emptyState
              }
            >
              No smart workspace alerts
              require attention.
            </div>
          )}

          <div
            className={
              styles.panelFooter
            }
          >
            <Link
              href="/dashboard"
              className={
                styles.footerLink
              }
              onClick={() =>
                setIsOpen(false)
              }
            >
              Open workspace
            </Link>

            {authenticated ? (
              <Link
                href="/dashboard/vendor/notifications"
                className={
                  styles.footerLinkSecondary
                }
                onClick={() =>
                  setIsOpen(false)
                }
              >
                Stored notifications
                {vendorCount > 0
                  ? ` (${vendorCount})`
                  : ""}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
