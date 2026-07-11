"use client";

import Link from "next/link";

import {
  useOptional3BOSRuntime,
} from "@/lib/3bos/context";

const MAX_BUSINESS_ACTIONS = 8;

function isBusinessAction(
  href: string
): boolean {
  return (
    href.startsWith("/dashboard/vendor") ||
    href.startsWith("/property") ||
    href.startsWith("/materials") ||
    href.startsWith("/services") ||
    href.startsWith("/rentals") ||
    href.startsWith("/blog")
  );
}

export default function ThreeBOSBusinessWorkSummary() {
  const context =
    useOptional3BOSRuntime();

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

  const businessWorkspaces =
    runtime.workspaces.available.filter(
      (workspace) =>
        workspace.status !== "future" &&
        (
          workspace.landingPath.startsWith(
            "/dashboard/vendor"
          ) ||
          workspace.navigation.some(
            (item) =>
              isBusinessAction(item.href)
          )
        )
    );

  const businessActions =
    availableActions
      .filter((action) =>
        isBusinessAction(action.href)
      )
      .slice(0, MAX_BUSINESS_ACTIONS);

  if (
    businessWorkspaces.length === 0 &&
    businessActions.length === 0
  ) {
    return null;
  }

  const primaryBusinessWorkspace =
    businessWorkspaces.find(
      (workspace) =>
        workspace.key ===
        runtime.workspaces.primary?.key
    ) ??
    businessWorkspaces[0] ??
    null;

  return (
    <section
      aria-labelledby="three-bos-business-work-title"
      style={{
        border:
          "1px solid rgba(5,150,105,0.22)",
        background:
          "linear-gradient(180deg,#ffffff 0%,#f0fdf4 100%)",
        borderRadius: 22,
        padding: 18,
        marginBottom: 16,
        boxShadow:
          "0 4px 14px rgba(15,23,42,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            id="three-bos-business-work-title"
            style={{
              color: "#064e3b",
              fontSize: 21,
              fontWeight: 950,
            }}
          >
            My Business Work
          </div>

          <p
            style={{
              margin: "6px 0 0",
              color: "#475569",
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: 760,
              fontWeight: 650,
            }}
          >
            Your business activities and daily
            actions are connected here. Open the
            work you need to continue.
          </p>
        </div>

        {primaryBusinessWorkspace ? (
          <Link
            href={
              primaryBusinessWorkspace
                .landingPath
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 42,
              padding: "10px 14px",
              borderRadius: 12,
              background: "#047857",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            Open{" "}
            {
              primaryBusinessWorkspace
                .shortLabel
            }{" "}
            →
          </Link>
        ) : null}
      </div>

      {businessWorkspaces.length > 0 ? (
        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {businessWorkspaces.map(
            (workspace) => (
              <Link
                key={workspace.key}
                href={
                  workspace.landingPath
                }
                title={
                  workspace.description
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 36,
                  padding: "8px 11px",
                  borderRadius: 999,
                  border:
                    "1px solid #bbf7d0",
                  background:
                    workspace.key ===
                    primaryBusinessWorkspace
                      ?.key
                      ? "#d1fae5"
                      : "#ffffff",
                  color: "#065f46",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 850,
                }}
              >
                {workspace.shortLabel}
              </Link>
            )
          )}
        </div>
      ) : null}

      {businessActions.length > 0 ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(210px,1fr))",
            gap: 10,
          }}
        >
          {businessActions.map(
            (action) => (
              <Link
                key={`${action.workspaceKey}:${action.key}:${action.href}`}
                href={action.href}
                style={{
                  display: "block",
                  minHeight: 92,
                  padding: 12,
                  border:
                    "1px solid #d1fae5",
                  borderRadius: 15,
                  background: "#ffffff",
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    color: "#064e3b",
                    fontSize: 14,
                    fontWeight: 950,
                  }}
                >
                  {action.label} →
                </div>

                <div
                  style={{
                    marginTop: 5,
                    color: "#64748b",
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {action.description}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#059669",
                    fontSize: 11,
                    fontWeight: 850,
                  }}
                >
                  {action.workspaceLabel}
                </div>
              </Link>
            )
          )}
        </div>
      ) : null}
    </section>
  );
}
