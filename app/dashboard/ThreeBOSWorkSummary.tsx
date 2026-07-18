"use client";

import Link from "next/link";

import {
  WorkspaceSummaryCard,
} from "@/components/3bos/workspace/WorkspaceSummaryCard";

import {
  adaptWorkspaceSummary,
  findWorkspaceSummaryAdapter,
  resolveWorkspaceSummary,
  type WorkspaceSummarySignals,
} from "@/lib/3bos/workspace";

import {
  useOptional3BOSRuntime,
} from "@/lib/3bos/context";

export type ThreeBOSWorkSummaryProps = {
  signals?: WorkspaceSummarySignals | null;
};

/**
 * P-02E Dashboard Bridge
 *
 * Connects the already-resolved 3BOS runtime workspace to:
 *
 * - P-02B Workspace Summary Engine
 * - P-02C Workspace Summary Adapters
 * - P-02D Workspace Presentation Components
 *
 * This component performs no authentication, routing mutation,
 * database lookup or automatic AI action.
 */
export default function ThreeBOSWorkSummary({
  signals,
}: ThreeBOSWorkSummaryProps) {
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

  const availableWorkspaces =
    context.runtime.workspaces.available.filter(
      (workspace) =>
        workspace.status !== "future"
    );

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <WorkspaceSummaryCard
        summary={summary}
        title={`${summary.workspace.shortLabel} Workspace`}
        showZeroMetrics={false}
        showRecommendedActions
        showRecentActivity
        activityLimit={5}
      />

      {availableWorkspaces.length > 1 ? (
        <nav
          aria-label="Available workspaces"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "#64748b",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Switch workspace:
          </span>

          {availableWorkspaces.map(
            (workspace) => {
              const active =
                workspace.key === workspaceKey;

              return (
                <Link
                  key={workspace.key}
                  href={workspace.landingPath}
                  title={workspace.description}
                  aria-current={
                    active ? "page" : undefined
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 34,
                    padding: "7px 11px",
                    borderRadius: 999,
                    border: active
                      ? "1px solid #93c5fd"
                      : "1px solid #dbeafe",
                    background: active
                      ? "#dbeafe"
                      : "#ffffff",
                    color: "#1e3a8a",
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: 850,
                  }}
                >
                  {workspace.shortLabel}
                </Link>
              );
            }
          )}
        </nav>
      ) : null}
    </div>
  );
}
