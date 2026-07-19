"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  WorkspaceSummaryActivity,
} from "@/lib/3bos/workspace";

import {
  getThreeBOSEvents,
  THREE_BOS_EVENT_BUS_UPDATE,
  threeBOSEventToWorkspaceActivity,
} from "@/lib/3bos/events";

import {
  projectWorkspaceTimeline,
  type WorkspaceTimelineEvent,
  type WorkspaceTimelinePeriod,
  type WorkspaceTimelineTone,
} from "@/lib/3bos/timeline";

import styles from "./workspace-command.module.css";

export type WorkspaceTimelineProps = {
  activity: WorkspaceSummaryActivity[];
  limit?: number;
};

const PERIOD_LABELS: Record<
  WorkspaceTimelinePeriod,
  string
> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
  unknown: "Recent activity",
};

const TONE_ICONS: Record<
  WorkspaceTimelineTone,
  string
> = {
  neutral: "•",
  information: "i",
  success: "✓",
  attention: "!",
  warning: "!",
};

function formatRelativeTime(
  occurredAt?: string | null
): string | null {
  if (!occurredAt) return null;

  const timestamp =
    new Date(occurredAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const diff = Math.max(
    0,
    Date.now() - timestamp
  );

  const minutes = Math.floor(
    diff / 60000
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days} day${
      days === 1 ? "" : "s"
    } ago`;
  }

  const date = new Date(timestamp);

  return new Intl.DateTimeFormat(
    undefined,
    {
      day: "numeric",
      month: "short",
    }
  ).format(date);
}

function toneClass(
  tone: WorkspaceTimelineTone
): string {
  if (tone === "success") {
    return styles.timelineDotSuccess;
  }

  if (tone === "attention") {
    return styles.timelineDotAttention;
  }

  if (tone === "warning") {
    return styles.timelineDotWarning;
  }

  if (tone === "information") {
    return styles.timelineDotInformation;
  }

  return styles.timelineDotNeutral;
}

function TimelineItem({
  item,
}: {
  item: WorkspaceTimelineEvent;
}) {
  const relativeTime =
    formatRelativeTime(item.occurredAt);

  const content = (
    <>
      <div className={styles.timelineRail}>
        <span
          className={[
            styles.timelineDot,
            toneClass(item.tone),
          ].join(" ")}
          aria-hidden="true"
        >
          {TONE_ICONS[item.tone]}
        </span>
      </div>

      <div className={styles.timelineContent}>
        <div className={styles.timelineTitleRow}>
          <div className={styles.timelineTitle}>
            {item.humanLabel}
          </div>

          {relativeTime ? (
            <span
              className={styles.timelineRelativeTime}
            >
              {relativeTime}
            </span>
          ) : null}
        </div>

        {item.humanDescription ? (
          <p
            className={styles.timelineDescription}
          >
            {item.humanDescription}
          </p>
        ) : null}

        <div className={styles.timelineMeta}>
          <span
            className={
              styles.timelineCategoryBadge
            }
          >
            {item.normalizedCategory}
          </span>

          <span
            className={[
              styles.timelineToneBadge,
              styles[
                `timelineTone${item.tone
                  .charAt(0)
                  .toUpperCase()}${item.tone.slice(
                  1
                )}`
              ],
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.tone === "neutral"
              ? "Activity"
              : item.tone}
          </span>
        </div>
      </div>

      {item.href ? (
        <span
          className={styles.timelineArrow}
          aria-hidden="true"
        >
          →
        </span>
      ) : null}
    </>
  );

  return item.href ? (
    <Link
      href={item.href}
      className={styles.timelineItem}
    >
      {content}
    </Link>
  ) : (
    <div className={styles.timelineItem}>
      {content}
    </div>
  );
}

export function WorkspaceTimeline({
  activity,
  limit = 8,
}: WorkspaceTimelineProps) {
  const [busActivity, setBusActivity] =
    useState<WorkspaceSummaryActivity[]>(
      []
    );

  useEffect(() => {
    function refreshBusActivity() {
      const events = getThreeBOSEvents({
        limit: Math.max(limit * 2, 20),
      });

      setBusActivity(
        events.map(
          threeBOSEventToWorkspaceActivity
        )
      );
    }

    refreshBusActivity();

    window.addEventListener(
      THREE_BOS_EVENT_BUS_UPDATE,
      refreshBusActivity
    );

    window.addEventListener(
      "storage",
      refreshBusActivity
    );

    return () => {
      window.removeEventListener(
        THREE_BOS_EVENT_BUS_UPDATE,
        refreshBusActivity
      );

      window.removeEventListener(
        "storage",
        refreshBusActivity
      );
    };
  }, [limit]);

  const projection = useMemo(
    () =>
      projectWorkspaceTimeline(
        [
          ...busActivity,
          ...activity,
        ],
        {
          limit,
        }
      ),
    [
      activity,
      busActivity,
      limit,
    ]
  );

  const groups = useMemo(
    () =>
      [
        {
          period:
            "today" as WorkspaceTimelinePeriod,
          events: projection.today,
        },
        {
          period:
            "yesterday" as WorkspaceTimelinePeriod,
          events: projection.yesterday,
        },
        {
          period:
            "earlier" as WorkspaceTimelinePeriod,
          events: projection.earlier,
        },
        {
          period:
            "unknown" as WorkspaceTimelinePeriod,
          events: projection.unknown,
        },
      ].filter(
        (group) =>
          group.events.length > 0
      ),
    [projection]
  );

  if (projection.events.length === 0) {
    return (
      <div className={styles.timelineEmpty}>
        <div
          className={
            styles.timelineEmptyIcon
          }
          aria-hidden="true"
        >
          ↗
        </div>

        <div>
          <div
            className={
              styles.timelineEmptyTitle
            }
          >
            Your work history will appear here
          </div>

          <div
            className={
              styles.timelineEmptyDescription
            }
          >
            RFQs, quotations, messages,
            approvals, payments and deliveries
            will be organised automatically.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.timelineSummary}>
        <div>
          <div
            className={
              styles.timelineSummaryValue
            }
          >
            {projection.total}
          </div>

          <div
            className={
              styles.timelineSummaryLabel
            }
          >
            Recent events
          </div>
        </div>

        <div>
          <div
            className={
              styles.timelineSummaryValue
            }
          >
            {projection.attentionCount}
          </div>

          <div
            className={
              styles.timelineSummaryLabel
            }
          >
            Need attention
          </div>
        </div>

        <div>
          <div
            className={
              styles.timelineSummaryValue
            }
          >
            {projection.successCount}
          </div>

          <div
            className={
              styles.timelineSummaryLabel
            }
          >
            Completed
          </div>
        </div>
      </div>

      <div className={styles.timelineGroups}>
        {groups.map((group) => (
          <section
            key={group.period}
            className={styles.timelineGroup}
          >
            <div
              className={
                styles.timelineGroupHeader
              }
            >
              <span>
                {PERIOD_LABELS[group.period]}
              </span>

              <span
                className={
                  styles.timelineGroupCount
                }
              >
                {group.events.length}
              </span>
            </div>

            <div className={styles.timeline}>
              {group.events.map((item) => (
                <TimelineItem
                  key={[
                    item.id,
                    item.timestamp ??
                      "unknown",
                  ].join("-")}
                  item={item}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default WorkspaceTimeline;
