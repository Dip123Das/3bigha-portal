import type {
  VendorWorkspaceAction,
  VendorWorkspaceProjection,
  VendorWorkspaceTone,
} from "@/lib/3bos/vendor/resolve-vendor-workspace-projection";

type VendorHumanFirstWorkCentreProps = {
  projection: VendorWorkspaceProjection;
};

function getToneStyle(tone: VendorWorkspaceTone) {
  if (tone === "positive") {
    return {
      border: "#bbf7d0",
      background: "#f0fdf4",
      accent: "#047857",
      badge: "#dcfce7",
      label: "Ready",
    };
  }

  if (tone === "attention") {
    return {
      border: "#fde68a",
      background: "#fffbeb",
      accent: "#92400e",
      badge: "#fef3c7",
      label: "Needs attention",
    };
  }

  return {
    border: "#dbeafe",
    background: "#eff6ff",
    accent: "#1d4ed8",
    badge: "#dbeafe",
    label: "Business setup",
  };
}

function WorkActionCard({
  action,
  position,
}: {
  action: VendorWorkspaceAction;
  position: number;
}) {
  const tone = getToneStyle(action.tone);

  return (
    <a
      href={action.href}
      data-work-action-key={action.key}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 13,
        minWidth: 0,
        padding: 15,
        border: `1px solid ${tone.border}`,
        borderRadius: 18,
        background: tone.background,
        color: "inherit",
        textDecoration: "none",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 999,
          background: "#ffffff",
          color: tone.accent,
          fontSize: 13,
          fontWeight: 950,
          boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
        }}
      >
        {position}
      </span>

      <span style={{ minWidth: 0, flex: "1 1 auto" }}>
        <span
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "#0f172a",
              fontSize: 14,
              lineHeight: 1.4,
              fontWeight: 950,
            }}
          >
            {action.label}
          </span>

          <span
            style={{
              flex: "0 0 auto",
              padding: "4px 8px",
              borderRadius: 999,
              background: tone.badge,
              color: tone.accent,
              fontSize: 10,
              lineHeight: 1.2,
              fontWeight: 900,
            }}
          >
            {tone.label}
          </span>
        </span>

        <span
          style={{
            display: "block",
            marginTop: 5,
            color: "#475569",
            fontSize: 12,
            lineHeight: 1.55,
            fontWeight: 700,
          }}
        >
          {action.detail}
        </span>

        <span
          style={{
            display: "inline-flex",
            marginTop: 10,
            color: tone.accent,
            fontSize: 11,
            lineHeight: 1.3,
            fontWeight: 950,
          }}
        >
          Open this work →
        </span>
      </span>
    </a>
  );
}

export default function VendorHumanFirstWorkCentre({
  projection,
}: VendorHumanFirstWorkCentreProps) {
  const actions = projection.workNow;
  const primaryAction = actions[0];
  const remainingActions = actions.slice(1);

  return (
    <section
      aria-labelledby="vendor-human-first-work-title"
      data-v2-human-first-work-centre="active"
      data-v2-work-action-count={actions.length}
      style={{
        marginBottom: 16,
        overflow: "hidden",
        border: "1px solid #bbf7d0",
        borderRadius: 24,
        background:
          "linear-gradient(135deg, rgba(240,253,244,0.98), rgba(255,255,255,0.98) 60%, rgba(236,253,245,0.96))",
        boxShadow: "0 12px 30px rgba(16,185,129,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          padding: 20,
          borderBottom: "1px solid #dcfce7",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 460px" }}>
          <div
            style={{
              color: "#047857",
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Human-First Work
          </div>

          <h2
            id="vendor-human-first-work-title"
            style={{
              margin: "7px 0 0",
              color: "#0f172a",
              fontSize: "clamp(22px, 2.5vw, 30px)",
              lineHeight: 1.2,
              fontWeight: 950,
            }}
          >
            What should I do now?
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              maxWidth: 760,
              color: "#475569",
              fontSize: 13,
              lineHeight: 1.65,
              fontWeight: 700,
            }}
          >
            Start with the first task. Complete human responsibilities before
            reviewing secondary analytics, rankings or paid growth options.
          </p>
        </div>

        <a
          href="/dashboard/workspace"
          style={{
            flex: "0 0 auto",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 42,
            padding: "0 14px",
            border: "1px solid #bbf7d0",
            borderRadius: 12,
            background: "#ffffff",
            color: "#047857",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 950,
          }}
        >
          Open Unified Workspace →
        </a>
      </div>

      <div style={{ padding: 20 }}>
        {primaryAction ? (
          <div
            data-v2-primary-work-action={primaryAction.key}
            style={{
              marginBottom: remainingActions.length > 0 ? 14 : 0,
              padding: 16,
              border: "1px solid #86efac",
              borderRadius: 20,
              background: "#ffffff",
              boxShadow: "0 8px 22px rgba(16,185,129,0.08)",
            }}
          >
            <div
              style={{
                color: "#047857",
                fontSize: 10,
                fontWeight: 950,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Start here
            </div>

            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                gap: 14,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#0f172a",
                    fontSize: 19,
                    lineHeight: 1.35,
                    fontWeight: 950,
                  }}
                >
                  {primaryAction.label}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: "#475569",
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontWeight: 700,
                  }}
                >
                  {primaryAction.detail}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <a
                  href={primaryAction.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 46,
                    padding: "0 18px",
                    borderRadius: 13,
                    background: "#047857",
                    color: "#ffffff",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 950,
                    boxShadow: "0 8px 18px rgba(4,120,87,0.2)",
                  }}
                >
                  Begin this work →
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {remainingActions.length > 0 ? (
          <>
            <div
              style={{
                marginBottom: 9,
                color: "#64748b",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Continue afterwards
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 310px), 1fr))",
                gap: 11,
              }}
            >
              {remainingActions.map((action, index) => (
                <WorkActionCard
                  key={action.key}
                  action={action}
                  position={index + 2}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
