import Link from "next/link";

import type {
  WorkspaceSummaryActivity,
} from "@/lib/3bos/workspace";

import {
  WorkspaceSection,
} from "./WorkspaceSection";

import styles from "./workspace-summary.module.css";

export type WorkspaceRecentActivityProps = {
  activities: WorkspaceSummaryActivity[];
  limit?: number;
};

function formatActivityDate(
  value: string | null | undefined
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function ActivityContent({
  activity,
}: {
  activity: WorkspaceSummaryActivity;
}) {
  const dateLabel = formatActivityDate(
    activity.occurredAt
  );

  return (
    <>
      <span
        className={styles.activityMarker}
        aria-hidden="true"
      />

      <div className={styles.activityContent}>
        <div className={styles.activityTitleRow}>
          <strong
            className={styles.activityTitle}
          >
            {activity.label}
          </strong>

          {dateLabel ? (
            <time
              className={styles.activityDate}
              dateTime={
                activity.occurredAt ?? undefined
              }
            >
              {dateLabel}
            </time>
          ) : null}
        </div>

        {activity.description ? (
          <p
            className={
              styles.activityDescription
            }
          >
            {activity.description}
          </p>
        ) : null}

        {activity.category ? (
          <span
            className={styles.activityCategory}
          >
            {activity.category}
          </span>
        ) : null}
      </div>
    </>
  );
}

export function WorkspaceRecentActivity({
  activities,
  limit = 5,
}: WorkspaceRecentActivityProps) {
  const visibleActivities = activities.slice(
    0,
    Math.max(1, limit)
  );

  if (visibleActivities.length === 0) {
    return null;
  }

  return (
    <WorkspaceSection
      title="Recent activity"
      description="Your latest work across this workspace."
      compact
    >
      <div className={styles.activityList}>
        {visibleActivities.map((activity) =>
          activity.href ? (
            <Link
              key={activity.id}
              href={activity.href}
              className={styles.activityItem}
            >
              <ActivityContent
                activity={activity}
              />
            </Link>
          ) : (
            <div
              key={activity.id}
              className={styles.activityItem}
            >
              <ActivityContent
                activity={activity}
              />
            </div>
          )
        )}
      </div>
    </WorkspaceSection>
  );
}
