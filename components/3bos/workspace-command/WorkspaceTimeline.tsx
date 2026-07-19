import Link from "next/link";

import type {
  WorkspaceSummaryActivity,
} from "@/lib/3bos/workspace";

import styles from "./workspace-command.module.css";

export type WorkspaceTimelineProps = {
  activity: WorkspaceSummaryActivity[];
  limit?: number;
};

function formatActivityTime(
  occurredAt?: string | null
): string | null {
  if (!occurredAt) {
    return null;
  }

  const date = new Date(occurredAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function WorkspaceTimeline({
  activity,
  limit = 5,
}: WorkspaceTimelineProps) {
  const items = activity.slice(0, limit);

  if (items.length === 0) {
    return (
      <div className={styles.timelineEmpty}>
        Workspace activity will appear here as work
        progresses.
      </div>
    );
  }

  return (
    <div className={styles.timeline}>
      {items.map((item) => {
        const content = (
          <>
            <div className={styles.timelineRail}>
              <span className={styles.timelineDot} />
            </div>

            <div className={styles.timelineContent}>
              <div className={styles.timelineTitle}>
                {item.label}
              </div>

              {item.description ? (
                <p className={styles.timelineDescription}>
                  {item.description}
                </p>
              ) : null}

              <div className={styles.timelineMeta}>
                {item.category ? (
                  <span>{item.category}</span>
                ) : null}

                {formatActivityTime(
                  item.occurredAt
                ) ? (
                  <span>
                    {formatActivityTime(
                      item.occurredAt
                    )}
                  </span>
                ) : null}
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
            key={item.id}
            href={item.href}
            className={styles.timelineItem}
          >
            {content}
          </Link>
        ) : (
          <div
            key={item.id}
            className={styles.timelineItem}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

export default WorkspaceTimeline;
