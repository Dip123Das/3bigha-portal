import Link from "next/link";

import type {
  WorkspaceSummaryAction,
} from "@/lib/3bos/workspace";

import {
  WorkspaceSection,
} from "./WorkspaceSection";

import styles from "./workspace-summary.module.css";

export type WorkspaceRecommendedActionsProps = {
  actions: WorkspaceSummaryAction[];
};

const ACTION_REASON_LABELS: Record<
  WorkspaceSummaryAction["reason"],
  string
> = {
  attention: "Needs attention",
  continue_work: "Continue",
  primary: "Recommended",
  discovery: "Explore",
};

export function WorkspaceRecommendedActions({
  actions,
}: WorkspaceRecommendedActionsProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <WorkspaceSection
      title="What would you like to do next?"
      description="Continue important work or start a new task."
      compact
    >
      <div className={styles.actionsList}>
        {actions.map((action) => (
          <Link
            key={action.key}
            href={action.href}
            className={`${styles.actionCard} ${
              action.reason === "attention"
                ? styles.actionCardAttention
                : ""
            }`}
          >
            <div className={styles.actionContent}>
              <div
                className={styles.actionTitleRow}
              >
                <strong
                  className={styles.actionTitle}
                >
                  {action.label}
                </strong>

                <span
                  className={styles.actionReason}
                >
                  {
                    ACTION_REASON_LABELS[
                      action.reason
                    ]
                  }
                </span>
              </div>

              <p
                className={
                  styles.actionDescription
                }
              >
                {action.description}
              </p>
            </div>

            <span
              className={styles.actionArrow}
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </WorkspaceSection>
  );
}
