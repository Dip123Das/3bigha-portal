import Link from "next/link";

import type {
  WorkspaceSummary,
} from "@/lib/3bos/workspace";

import styles from "./workspace-summary.module.css";

export type WorkspaceEmptyStateProps = {
  summary: WorkspaceSummary;
};

export function WorkspaceEmptyState({
  summary,
}: WorkspaceEmptyStateProps) {
  const firstAction =
    summary.recommendedActions[0];

  return (
    <div className={styles.emptyState}>
      <div
        className={styles.emptyIcon}
        aria-hidden="true"
      >
        ✓
      </div>

      <div className={styles.emptyContent}>
        <h3 className={styles.emptyTitle}>
          You are all caught up
        </h3>

        <p className={styles.emptyDescription}>
          There is no pending activity in{" "}
          {summary.workspace.shortLabel}.
          You can start something new whenever
          you are ready.
        </p>

        {firstAction ? (
          <Link
            href={firstAction.href}
            className={styles.primaryButton}
          >
            {firstAction.label}
          </Link>
        ) : summary.workspace.landingPath ? (
          <Link
            href={summary.workspace.landingPath}
            className={styles.primaryButton}
          >
            Open workspace
          </Link>
        ) : null}
      </div>
    </div>
  );
}
