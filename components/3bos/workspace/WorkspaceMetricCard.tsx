import Link from "next/link";

import type {
  WorkspaceSummaryMetric,
} from "@/lib/3bos/workspace";

import styles from "./workspace-summary.module.css";

export type WorkspaceMetricCardProps = {
  metric: WorkspaceSummaryMetric;
};

function MetricContent({
  metric,
}: WorkspaceMetricCardProps) {
  return (
    <>
      <div className={styles.metricTopRow}>
        <span className={styles.metricLabel}>
          {metric.label}
        </span>

        {metric.attentionRequired &&
        metric.value > 0 ? (
          <span
            className={styles.attentionIndicator}
            aria-label="Needs attention"
            title="Needs attention"
          >
            !
          </span>
        ) : null}
      </div>

      <strong className={styles.metricValue}>
        {metric.value.toLocaleString("en-IN")}
      </strong>

      <span className={styles.metricHint}>
        {metric.value === 0
          ? "Nothing pending"
          : metric.attentionRequired
          ? "Review now"
          : "View details"}
      </span>
    </>
  );
}

export function WorkspaceMetricCard({
  metric,
}: WorkspaceMetricCardProps) {
  const className = `${styles.metricCard} ${
    metric.attentionRequired &&
    metric.value > 0
      ? styles.metricCardAttention
      : ""
  }`;

  if (!metric.href) {
    return (
      <div className={className}>
        <MetricContent metric={metric} />
      </div>
    );
  }

  return (
    <Link
      href={metric.href}
      className={className}
    >
      <MetricContent metric={metric} />
    </Link>
  );
}
