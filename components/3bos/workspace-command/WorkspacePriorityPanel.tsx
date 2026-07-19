import Link from "next/link";

import type {
  WorkspaceSummaryAction,
  WorkspaceSummaryMetric,
} from "@/lib/3bos/workspace";

import styles from "./workspace-command.module.css";

export type WorkspacePriorityPanelProps = {
  metrics: WorkspaceSummaryMetric[];
  actions: WorkspaceSummaryAction[];
};

export function WorkspacePriorityPanel({
  metrics,
  actions,
}: WorkspacePriorityPanelProps) {
  const attentionMetrics = metrics
    .filter(
      (metric) =>
        metric.attentionRequired &&
        metric.value > 0
    )
    .slice(0, 4);

  const attentionActions = actions
    .filter(
      (action) =>
        action.reason === "attention"
    )
    .slice(0, 4);

  const hasPriorities =
    attentionMetrics.length > 0 ||
    attentionActions.length > 0;

  if (!hasPriorities) {
    return (
      <div className={styles.priorityClear}>
        <div className={styles.priorityClearIcon}>
          ✓
        </div>

        <div>
          <div className={styles.priorityClearTitle}>
            No urgent work right now
          </div>

          <p className={styles.priorityClearDescription}>
            Your workspace has no item marked for
            immediate attention.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.priorityList}>
      {attentionMetrics.map((metric) => {
        const content = (
          <>
            <div className={styles.priorityCount}>
              {metric.value}
            </div>

            <div className={styles.priorityContent}>
              <div className={styles.priorityTitle}>
                {metric.label}
              </div>

              <div className={styles.priorityHint}>
                Requires your attention
              </div>
            </div>

            {metric.href ? (
              <span
                className={styles.priorityArrow}
                aria-hidden="true"
              >
                →
              </span>
            ) : null}
          </>
        );

        return metric.href ? (
          <Link
            key={metric.key}
            href={metric.href}
            className={styles.priorityItem}
          >
            {content}
          </Link>
        ) : (
          <div
            key={metric.key}
            className={styles.priorityItem}
          >
            {content}
          </div>
        );
      })}

      {attentionActions.map((action) => (
        <Link
          key={action.key}
          href={action.href}
          className={styles.priorityItem}
        >
          <div className={styles.priorityMark}>
            !
          </div>

          <div className={styles.priorityContent}>
            <div className={styles.priorityTitle}>
              {action.label}
            </div>

            <div className={styles.priorityHint}>
              {action.description}
            </div>
          </div>

          <span
            className={styles.priorityArrow}
            aria-hidden="true"
          >
            →
          </span>
        </Link>
      ))}
    </div>
  );
}

export default WorkspacePriorityPanel;
