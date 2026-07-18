import type {
  ReactNode,
} from "react";

import styles from "./workspace-summary.module.css";

export type WorkspaceSectionProps = {
  title: string;
  description?: string | null;
  children: ReactNode;
  compact?: boolean;
};

export function WorkspaceSection({
  title,
  description,
  children,
  compact = false,
}: WorkspaceSectionProps) {
  return (
    <section
      className={
        compact
          ? styles.sectionCompact
          : styles.section
      }
    >
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>
            {title}
          </h3>

          {description ? (
            <p className={styles.sectionDescription}>
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {children}
    </section>
  );
}
