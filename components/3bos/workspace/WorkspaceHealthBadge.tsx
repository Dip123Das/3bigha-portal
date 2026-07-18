import type {
  WorkspaceSummary,
} from "@/lib/3bos/workspace";

import styles from "./workspace-summary.module.css";

export type WorkspaceHealthBadgeProps = {
  health: WorkspaceSummary["health"];
};

const HEALTH_LABELS: Record<
  WorkspaceSummary["health"]["state"],
  string
> = {
  healthy: "Running well",
  attention: "Needs attention",
  limited: "Limited",
  unavailable: "Unavailable",
};

export function WorkspaceHealthBadge({
  health,
}: WorkspaceHealthBadgeProps) {
  return (
    <span
      className={`${styles.healthBadge} ${
        styles[`health_${health.state}`]
      }`}
      title={
        health.reasons.length > 0
          ? health.reasons.join(", ")
          : HEALTH_LABELS[health.state]
      }
    >
      <span
        className={styles.healthDot}
        aria-hidden="true"
      />

      {HEALTH_LABELS[health.state]}
    </span>
  );
}
