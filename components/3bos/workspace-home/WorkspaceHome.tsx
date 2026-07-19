"use client";

import Link from "next/link";

import {
  adaptWorkspaceSummary,
  findWorkspaceSummaryAdapter,
  resolveWorkspaceSummary,
  type WorkspaceSummarySignals,
} from "@/lib/3bos/workspace";

import {
  useOptional3BOSRuntime,
} from "@/lib/3bos/context";

import {
  WorkspaceHealthBadge,
  WorkspaceMetricsGrid,
} from "@/components/3bos/workspace";

import styles from "./workspace-home.module.css";

export type WorkspaceHomeProps = {
  signals?: WorkspaceSummarySignals | null;
  greeting?: string;
  actionLimit?: number;
};

export function WorkspaceHome({
  signals,
  greeting = "Welcome back",
  actionLimit = 6,
}: WorkspaceHomeProps) {
  const context = useOptional3BOSRuntime();

  if (
    !context ||
    context.status !== "ready" ||
    !context.runtime
  ) {
    return null;
  }

  const primaryWorkspace =
    context.runtime.workspaces.primary;

  if (!primaryWorkspace) {
    return null;
  }

  const workspaceKey = primaryWorkspace.key;

  const adapter =
    findWorkspaceSummaryAdapter(workspaceKey);

  const summary = adapter
    ? adaptWorkspaceSummary({
        workspaceKey,
        signals,
      }).summary
    : resolveWorkspaceSummary({
        workspaceKey,
        ...(signals ?? {}),
      });

  const journeys =
    context.journeyContext.primaryWorkspaceJourneys
      .filter(
        (journey) =>
          journey.status !== "future"
      )
      .slice(0, actionLimit);

  const fallbackActions =
    context.primaryWorkspaceActions
      .filter(
        (action) =>
          action.status !== "future"
      )
      .slice(0, actionLimit);

  const availableWorkspaces =
    context.runtime.workspaces.available.filter(
      (workspace) =>
        workspace.status !== "future"
    );

  const hasJourneys = journeys.length > 0;

  return (
    <section
      className={styles.workspaceHome}
      aria-labelledby="three-bos-workspace-home-title"
    >
      <header className={styles.hero}>
        <div className={styles.heroIdentity}>
          <div className={styles.greeting}>
            {greeting}
          </div>

          <h1
            id="three-bos-workspace-home-title"
            className={styles.title}
          >
            {summary.workspace.label}
          </h1>

          <p className={styles.description}>
            {summary.workspace.description}
          </p>
        </div>

        <div className={styles.heroStatus}>
          <WorkspaceHealthBadge
            health={summary.health}
          />

          {summary.workspace.landingPath ? (
            <Link
              href={summary.workspace.landingPath}
              className={styles.primaryButton}
            >
              Open workspace
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      </header>

      {availableWorkspaces.length > 1 ? (
        <nav
          className={styles.workspaceSwitcher}
          aria-label="Available workspaces"
        >
          <span className={styles.switcherLabel}>
            Your workspaces
          </span>

          <div className={styles.workspaceChips}>
            {availableWorkspaces.map(
              (workspace) => {
                const active =
                  workspace.key === workspaceKey;

                return (
                  <Link
                    key={workspace.key}
                    href={workspace.landingPath}
                    aria-current={
                      active ? "page" : undefined
                    }
                    title={workspace.description}
                    className={
                      active
                        ? styles.workspaceChipActive
                        : styles.workspaceChip
                    }
                  >
                    {workspace.shortLabel}
                  </Link>
                );
              }
            )}
          </div>
        </nav>
      ) : null}

      <div className={styles.metricsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionEyebrow}>
              Today
            </div>

            <h2 className={styles.sectionTitle}>
              Your important work
            </h2>
          </div>
        </div>

        <WorkspaceMetricsGrid
          metrics={summary.metrics}
          hideZeroMetrics
        />
      </div>

      <div className={styles.continueSection}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionEyebrow}>
              Continue
            </div>

            <h2 className={styles.sectionTitle}>
              Continue your work
            </h2>

            <p className={styles.sectionDescription}>
              Open the task you need without searching
              through different modules.
            </p>
          </div>
        </div>

        <div className={styles.actionGrid}>
          {hasJourneys
            ? journeys.map((journey) => (
                <Link
                  key={journey.key}
                  href={journey.href}
                  className={styles.actionCard}
                  onClick={() =>
                    context.selectJourney(
                      journey.key
                    )
                  }
                >
                  <div>
                    <div className={styles.actionLabel}>
                      {journey.label}
                    </div>

                    <p
                      className={
                        styles.actionDescription
                      }
                    >
                      {journey.description}
                    </p>
                  </div>

                  <span
                    className={styles.actionArrow}
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              ))
            : fallbackActions.map((action) => (
                <Link
                  key={`${action.workspaceKey}:${action.key}:${action.href}`}
                  href={action.href}
                  className={styles.actionCard}
                >
                  <div>
                    <div className={styles.actionLabel}>
                      {action.label}
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
      </div>
    </section>
  );
}

export default WorkspaceHome;
