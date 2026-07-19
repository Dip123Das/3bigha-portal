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
} from "@/components/3bos/workspace";

import {
  WorkspaceCommandCenter,
  type WorkspaceCommandAction,
} from "@/components/3bos/workspace-command";

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

  const journeyActions: WorkspaceCommandAction[] =
    journeys.map((journey) => ({
      key: journey.key,
      label: journey.label,
      description: journey.description,
      href: journey.href,
      reason: "continue_work",
      priority: 70,
      onSelect: () =>
        context.selectJourney(journey.key),
    }));

  const runtimeActions: WorkspaceCommandAction[] =
    fallbackActions.map((action) => ({
      key:
        `${action.workspaceKey}:` +
        `${action.key}:` +
        action.href,
      label: action.label,
      description: action.description,
      href: action.href,
      reason: "primary",
      priority: 50,
    }));

  const summaryActions: WorkspaceCommandAction[] =
    summary.recommendedActions
      .filter(
        (action) =>
          action.status !== "future"
      )
      .map((action) => ({
        key: `summary:${action.key}`,
        label: action.label,
        description: action.description,
        href: action.href,
        reason: action.reason,
        priority: action.priority,
      }));

  const continueActions =
    journeyActions.length > 0
      ? journeyActions
      : summaryActions.length > 0
        ? summaryActions
        : runtimeActions;

  const quickActions =
    summaryActions.length > 0
      ? summaryActions
      : runtimeActions;

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

      <WorkspaceCommandCenter
        summary={summary}
        continueActions={continueActions}
        quickActions={quickActions}
        priorities={summary.recommendedActions}
        metrics={summary.metrics}
        recentActivity={summary.recentActivity}
        activityLimit={5}
      />
    </section>
  );
}

export default WorkspaceHome;
