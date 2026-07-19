import type {
  WorkspaceSummary,
} from "@/lib/3bos/workspace";

import styles from "./workspace-command.module.css";

export type WorkspaceSnapshotProps = {
  summary: WorkspaceSummary;
};

export function WorkspaceSnapshot({
  summary,
}: WorkspaceSnapshotProps) {
  const cards = [
    {
      label: "Workspace health",
      value: `${summary.health.score}%`,
      detail:
        summary.health.attentionRequired
          ? "Some work needs attention"
          : "Workspace is operating normally",
    },
    {
      label: "Available actions",
      value: summary.availableActionCount,
      detail: "Actions currently available",
    },
    {
      label: "Capabilities",
      value: summary.capabilityCount,
      detail: "Connected operating capabilities",
    },
    {
      label: "Recent activity",
      value: summary.recentActivityCount,
      detail: "Latest recorded work events",
    },
  ];

  return (
    <div className={styles.snapshotGrid}>
      {cards.map((card) => (
        <div
          key={card.label}
          className={styles.snapshotCard}
        >
          <div className={styles.snapshotLabel}>
            {card.label}
          </div>

          <div className={styles.snapshotValue}>
            {card.value}
          </div>

          <div className={styles.snapshotDetail}>
            {card.detail}
          </div>
        </div>
      ))}
    </div>
  );
}

export default WorkspaceSnapshot;
