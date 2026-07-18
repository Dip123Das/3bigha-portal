import Link from "next/link";

import type {
  WorkspaceSummary,
} from "@/lib/3bos/workspace";

import {
  WorkspaceEmptyState,
} from "./WorkspaceEmptyState";

import {
  WorkspaceHealthBadge,
} from "./WorkspaceHealthBadge";

import {
  WorkspaceMetricsGrid,
} from "./WorkspaceMetricsGrid";

import {
  WorkspaceRecentActivity,
} from "./WorkspaceRecentActivity";

import {
  WorkspaceRecommendedActions,
} from "./WorkspaceRecommendedActions";

import styles from "./workspace-summary.module.css";

export type WorkspaceSummaryCardProps = {
  summary: WorkspaceSummary;
  title?: string;
  showZeroMetrics?: boolean;
  showRecommendedActions?: boolean;
  showRecentActivity?: boolean;
  activityLimit?: number;
};

export function WorkspaceSummaryCard({
  summary,
  title,
  showZeroMetrics = true,
  showRecommendedActions = true,
  showRecentActivity = true,
  activityLimit = 5,
}: WorkspaceSummaryCardProps) {
  return (
    <section
      className={styles.summaryCard}
      aria-labelledby={`workspace-summary-${summary.workspace.key ?? "unknown"}`}
    >
      <header className={styles.summaryHeader}>
        <div className={styles.summaryIdentity}>
          <div className={styles.eyebrow}>
            Your workspace
          </div>

          <h2
            id={`workspace-summary-${summary.workspace.key ?? "unknown"}`}
            className={styles.summaryTitle}
          >
            {title ?? summary.workspace.label}
          </h2>

          <p
            className={
              styles.summaryDescription
            }
          >
            {summary.workspace.description}
          </p>
        </div>

        <div className={styles.summaryStatus}>
          <WorkspaceHealthBadge
            health={summary.health}
          />

          {summary.workspace.landingPath ? (
            <Link
              href={
                summary.workspace.landingPath
              }
              className={styles.openWorkspaceLink}
            >
              Open workspace
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      </header>

      {summary.health.attentionRequired &&
      summary.health.reasons.length > 0 ? (
        <div
          className={styles.attentionNotice}
          role="status"
        >
          <strong>
            Some work may need your attention.
          </strong>

          <span>
            Review the highlighted items below.
          </span>
        </div>
      ) : null}

      <WorkspaceMetricsGrid
        metrics={summary.metrics}
        hideZeroMetrics={!showZeroMetrics}
      />

      {summary.empty ? (
        <WorkspaceEmptyState
          summary={summary}
        />
      ) : (
        <div className={styles.summaryBody}>
          {showRecommendedActions ? (
            <WorkspaceRecommendedActions
              actions={
                summary.recommendedActions
              }
            />
          ) : null}

          {showRecentActivity ? (
            <WorkspaceRecentActivity
              activities={
                summary.recentActivity
              }
              limit={activityLimit}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
