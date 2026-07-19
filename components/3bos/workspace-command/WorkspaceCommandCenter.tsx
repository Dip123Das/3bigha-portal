import WorkspaceNotificationCenter from "@/components/3bos/workspace-notifications";
import WorkspaceContinuePanel from "./WorkspaceContinuePanel";
import WorkspacePriorityPanel from "./WorkspacePriorityPanel";
import WorkspaceQuickActions from "./WorkspaceQuickActions";
import WorkspaceSnapshot from "./WorkspaceSnapshot";
import WorkspaceTimeline from "./WorkspaceTimeline";

import type {
  WorkspaceCommandCenterProps,
} from "./types";

import styles from "./workspace-command.module.css";

export function WorkspaceCommandCenter({
  summary,
  continueActions,
  quickActions,
  priorities = summary.recommendedActions,
  metrics = summary.metrics,
  recentActivity = summary.recentActivity,
  activityLimit = 5,
}: WorkspaceCommandCenterProps) {
  return (
    <div className={styles.commandCenter}>
      <section className={styles.commandSection}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionEyebrow}>
              Resume
            </div>

            <h2 className={styles.sectionTitle}>
              Continue your work
            </h2>

            <p className={styles.sectionDescription}>
              Return directly to your most relevant
              unfinished work.
            </p>
          </div>
        </div>

        <WorkspaceContinuePanel
          actions={continueActions}
        />
      </section>

      <WorkspaceNotificationCenter />

      <div className={styles.commandColumns}>
        <section className={styles.commandPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionEyebrow}>
                Today
              </div>

              <h2 className={styles.sectionTitle}>
                Priorities
              </h2>

              <p
                className={
                  styles.sectionDescription
                }
              >
                Work requiring attention now.
              </p>
            </div>
          </div>

          <WorkspacePriorityPanel
            metrics={metrics}
            actions={priorities}
          />
        </section>

        <section className={styles.commandPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionEyebrow}>
                Activity
              </div>

              <h2 className={styles.sectionTitle}>
                Recent timeline
              </h2>

              <p
                className={
                  styles.sectionDescription
                }
              >
                A simple record of what changed.
              </p>
            </div>
          </div>

          <WorkspaceTimeline
            activity={recentActivity}
            limit={activityLimit}
          />
        </section>
      </div>

      <section className={styles.commandSection}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionEyebrow}>
              Start
            </div>

            <h2 className={styles.sectionTitle}>
              Quick actions
            </h2>

            <p className={styles.sectionDescription}>
              Start common workspace tasks without
              searching through menus.
            </p>
          </div>
        </div>

        <WorkspaceQuickActions
          actions={quickActions}
        />
      </section>

      <section className={styles.commandSection}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionEyebrow}>
              Overview
            </div>

            <h2 className={styles.sectionTitle}>
              Performance snapshot
            </h2>
          </div>
        </div>

        <WorkspaceSnapshot summary={summary} />
      </section>
    </div>
  );
}

export default WorkspaceCommandCenter;
