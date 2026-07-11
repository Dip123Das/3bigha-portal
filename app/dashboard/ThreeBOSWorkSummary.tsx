"use client";

import Link from "next/link";

import {
  useOptional3BOSRuntime,
} from "@/lib/3bos/context";

const MAX_VISIBLE_ACTIONS = 6;

export default function ThreeBOSWorkSummary() {
  const context = useOptional3BOSRuntime();

  if (
    !context ||
    context.status !== "ready" ||
    !context.runtime
  ) {
    return null;
  }

  const {
    runtime,
    availableActions,
  } = context;

  const primaryWorkspace =
    runtime.workspaces.primary;

  const workspaces =
    runtime.workspaces.available.filter(
      (workspace) =>
        workspace.status !== "future"
    );

  if (
    !primaryWorkspace &&
    workspaces.length === 0 &&
    availableActions.length === 0
  ) {
    return null;
  }

  const visibleActions =
    availableActions.slice(
      0,
      MAX_VISIBLE_ACTIONS
    );

  return (
    <section
      aria-labelledby="three-bos-your-work-title"
      style={{
        border:
          "1px solid rgba(37,99,235,0.18)",
        background:
          "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        boxShadow:
          "0 2px 8px rgba(15,23,42,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            id="three-bos-your-work-title"
            style={{
              color: "#0f172a",
              fontSize: 20,
              fontWeight: 900,
            }}
          >
            Your Work
          </div>

          <div
            style={{
              marginTop: 5,
              color: "#475569",
              fontSize: 14,
              lineHeight: 1.55,
              maxWidth: 720,
            }}
          >
            Everything connected to your work is
            prepared here. Choose what you want to
            accomplish next.
          </div>
        </div>

        {primaryWorkspace ? (
          <Link
            href={
              primaryWorkspace.landingPath
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 42,
              padding: "10px 14px",
              borderRadius: 12,
              background: "#1d4ed8",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            Open{" "}
            {primaryWorkspace.shortLabel} →
          </Link>
        ) : null}
      </div>

      {workspaces.length > 0 ? (
        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {workspaces.map((workspace) => (
            <Link
              key={workspace.key}
              href={workspace.landingPath}
              title={workspace.description}
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 36,
                padding: "8px 11px",
                borderRadius: 999,
                border:
                  "1px solid #dbeafe",
                background:
                  workspace.key ===
                  primaryWorkspace?.key
                    ? "#dbeafe"
                    : "#ffffff",
                color: "#1e3a8a",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 850,
              }}
            >
              {workspace.shortLabel}
            </Link>
          ))}
        </div>
      ) : null}

      {visibleActions.length > 0 ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 10,
          }}
        >
          {visibleActions.map((action) => (
            <Link
              key={`${action.workspaceKey}:${action.key}:${action.href}`}
              href={action.href}
              style={{
                display: "block",
                border:
                  "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 12,
                background: "#ffffff",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  color: "#0f172a",
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                {action.label} →
              </div>

              <div
                style={{
                  marginTop: 5,
                  color: "#64748b",
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                {action.description}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#2563eb",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {action.workspaceLabel}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
