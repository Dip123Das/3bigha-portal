import Link from "next/link";

import type {
  WorkspaceCommandAction,
} from "./types";

import styles from "./workspace-command.module.css";

export type WorkspaceContinuePanelProps = {
  actions: WorkspaceCommandAction[];
};

export function WorkspaceContinuePanel({
  actions,
}: WorkspaceContinuePanelProps) {
  if (actions.length === 0) {
    return (
      <div className={styles.emptyPanel}>
        <div className={styles.emptyTitle}>
          No unfinished work
        </div>

        <p className={styles.emptyDescription}>
          Your current workspace has no unfinished task
          requiring immediate continuation.
        </p>
      </div>
    );
  }

  const primary = actions[0];
  const remaining = actions.slice(1, 4);

  return (
    <div className={styles.continueLayout}>
      <Link
        href={primary.href}
        className={styles.primaryContinueCard}
        onClick={primary.onSelect}
      >
        <div>
          <div className={styles.cardEyebrow}>
            Continue where you left off
          </div>

          <div className={styles.primaryContinueTitle}>
            {primary.label}
          </div>

          <p className={styles.primaryContinueDescription}>
            {primary.description}
          </p>
        </div>

        <span
          className={styles.primaryContinueArrow}
          aria-hidden="true"
        >
          →
        </span>
      </Link>

      {remaining.length > 0 ? (
        <div className={styles.secondaryContinueList}>
          {remaining.map((action) => (
            <Link
              key={action.key}
              href={action.href}
              className={styles.secondaryContinueCard}
              onClick={action.onSelect}
            >
              <div>
                <div className={styles.secondaryContinueTitle}>
                  {action.label}
                </div>

                <p
                  className={
                    styles.secondaryContinueDescription
                  }
                >
                  {action.description}
                </p>
              </div>

              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default WorkspaceContinuePanel;
