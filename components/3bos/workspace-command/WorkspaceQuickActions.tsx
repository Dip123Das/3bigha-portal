import Link from "next/link";

import type {
  WorkspaceCommandAction,
} from "./types";

import styles from "./workspace-command.module.css";

export type WorkspaceQuickActionsProps = {
  actions: WorkspaceCommandAction[];
};

export function WorkspaceQuickActions({
  actions,
}: WorkspaceQuickActionsProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={styles.quickActionGrid}>
      {actions.slice(0, 6).map((action) => (
        <Link
          key={action.key}
          href={action.href}
          className={styles.quickAction}
          onClick={action.onSelect}
        >
          <div>
            <div className={styles.quickActionTitle}>
              {action.label}
            </div>

            <p className={styles.quickActionDescription}>
              {action.description}
            </p>
          </div>

          <span
            className={styles.quickActionArrow}
            aria-hidden="true"
          >
            →
          </span>
        </Link>
      ))}
    </div>
  );
}

export default WorkspaceQuickActions;
