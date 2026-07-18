import type {
  WorkspaceSummaryMetric,
} from "@/lib/3bos/workspace";

import {
  WorkspaceMetricCard,
} from "./WorkspaceMetricCard";

import styles from "./workspace-summary.module.css";

export type WorkspaceMetricsGridProps = {
  metrics: WorkspaceSummaryMetric[];
  hideZeroMetrics?: boolean;
};

export function WorkspaceMetricsGrid({
  metrics,
  hideZeroMetrics = false,
}: WorkspaceMetricsGridProps) {
  const visibleMetrics = hideZeroMetrics
    ? metrics.filter(
        (metric) => metric.value > 0
      )
    : metrics;

  if (visibleMetrics.length === 0) {
    return null;
  }

  return (
    <div className={styles.metricsGrid}>
      {visibleMetrics.map((metric) => (
        <WorkspaceMetricCard
          key={metric.key}
          metric={metric}
        />
      ))}
    </div>
  );
}
