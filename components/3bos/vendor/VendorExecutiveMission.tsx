import type {
  VendorWorkspaceProjection,
  VendorWorkspaceTone,
} from "@/lib/3bos/vendor/resolve-vendor-workspace-projection";

type VendorExecutiveMissionProps = {
  projection: VendorWorkspaceProjection;
};

function getToneStyle(tone: VendorWorkspaceTone) {
  if (tone === "positive") {
    return {
      border: "#bbf7d0",
      background: "#f0fdf4",
      accent: "#047857",
    };
  }

  if (tone === "attention") {
    return {
      border: "#fde68a",
      background: "#fffbeb",
      accent: "#92400e",
    };
  }

  return {
    border: "#dbeafe",
    background: "#eff6ff",
    accent: "#1d4ed8",
  };
}

export default function VendorExecutiveMission({
  projection,
}: VendorExecutiveMissionProps) {
  const priorities = projection.workNow.slice(0, 3);

  const pulseItems = [
    {
      label: "New requirements",
      value: projection.pulse.newLeads,
    },
    {
      label: "Buyer conversations",
      value: projection.pulse.unreadConversations,
    },
    {
      label: "Ready deals",
      value: projection.pulse.readyDeals,
    },
    {
      label: "Alerts",
      value: projection.pulse.alerts,
    },
  ];

  return (
    <section
      aria-labelledby="vendor-executive-mission-title"
      data-v1c-executive-mission="active"
      style={{
        marginBottom: 16,
        overflow: "hidden",
        border: "1px solid #bfdbfe",
        borderRadius: 24,
        background:
          "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(255,255,255,0.98) 55%, rgba(238,242,255,0.96))",
        boxShadow: "0 14px 34px rgba(37,99,235,0.09)",
      }}
    >
      <div
        style={{
          padding: 20,
          borderBottom: "1px solid #dbeafe",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 420px" }}>
            <div
              style={{
                color: "#1d4ed8",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Executive Mission
            </div>

            <h1
              id="vendor-executive-mission-title"
              style={{
                margin: "7px 0 0",
                color: "#0f172a",
                fontSize: "clamp(24px, 3vw, 34px)",
                lineHeight: 1.15,
                fontWeight: 950,
              }}
            >
              Run today&apos;s business from one clear place
            </h1>

            <p
              style={{
                margin: "9px 0 0",
                maxWidth: 760,
                color: "#475569",
                fontSize: 14,
                lineHeight: 1.65,
                fontWeight: 650,
              }}
            >
              Review the work that needs human attention first. Business
              signals and AI guidance remain available to support your final
              decision.
            </p>
          </div>

          <div
            style={{
              flex: "0 1 280px",
              minWidth: 230,
              padding: 14,
              border: "1px solid #bbf7d0",
              borderRadius: 18,
              background: "#ffffff",
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Business readiness
            </div>

            <div
              style={{
                marginTop: 5,
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <strong
                style={{
                  color: "#047857",
                  fontSize: 28,
                  lineHeight: 1,
                  fontWeight: 950,
                }}
              >
                {projection.readiness.score}/100
              </strong>

              <span
                style={{
                  color: "#047857",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {projection.readiness.label}
              </span>
            </div>

            <div
              aria-hidden="true"
              style={{
                marginTop: 10,
                height: 7,
                overflow: "hidden",
                borderRadius: 999,
                background: "#dcfce7",
              }}
            >
              <div
                style={{
                  width: `${projection.readiness.score}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "#10b981",
                }}
              />
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#475569",
                fontSize: 12,
                lineHeight: 1.5,
                fontWeight: 700,
              }}
            >
              {projection.identity.title} ·{" "}
              {projection.identity.capabilityCount} active business{" "}
              {projection.identity.capabilityCount === 1
                ? "segment"
                : "segments"}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 16,
          padding: 20,
        }}
      >
        <div>
          <div
            style={{
              color: "#0f172a",
              fontSize: 18,
              fontWeight: 950,
            }}
          >
            Today&apos;s priorities
          </div>

          <div
            style={{
              marginTop: 4,
              color: "#64748b",
              fontSize: 12,
              lineHeight: 1.5,
              fontWeight: 700,
            }}
          >
            Complete the most important human actions before reviewing
            secondary analytics.
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 10,
            }}
          >
            {priorities.map((action, index) => {
              const tone = getToneStyle(action.tone);

              return (
                <a
                  key={action.key}
                  href={action.href}
                  style={{
                    display: "block",
                    padding: 13,
                    border: `1px solid ${tone.border}`,
                    borderRadius: 16,
                    background: tone.background,
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        flex: "0 0 auto",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 25,
                        height: 25,
                        borderRadius: 999,
                        background: "#ffffff",
                        color: tone.accent,
                        fontSize: 12,
                        fontWeight: 950,
                      }}
                    >
                      {index + 1}
                    </span>

                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          color: "#0f172a",
                          fontSize: 13,
                          lineHeight: 1.4,
                          fontWeight: 950,
                        }}
                      >
                        {action.label}
                      </span>

                      <span
                        style={{
                          display: "block",
                          marginTop: 3,
                          color: "#475569",
                          fontSize: 12,
                          lineHeight: 1.5,
                          fontWeight: 700,
                        }}
                      >
                        {action.detail}
                      </span>
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        <div>
          <div
            style={{
              color: "#0f172a",
              fontSize: 18,
              fontWeight: 950,
            }}
          >
            Business pulse
          </div>

          <div
            style={{
              marginTop: 4,
              color: "#64748b",
              fontSize: 12,
              lineHeight: 1.5,
              fontWeight: 700,
            }}
          >
            A compact view of the live activity around your business.
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {pulseItems.map((item) => (
              <div
                key={item.label}
                style={{
                  minWidth: 0,
                  padding: 13,
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    color: "#0f172a",
                    fontSize: 23,
                    lineHeight: 1,
                    fontWeight: 950,
                  }}
                >
                  {item.value}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: "#64748b",
                    fontSize: 11,
                    lineHeight: 1.4,
                    fontWeight: 800,
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 10,
              padding: 13,
              border: "1px solid #ddd6fe",
              borderRadius: 16,
              background: "#f5f3ff",
            }}
          >
            <div
              style={{
                color: "#6d28d9",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Business guidance
            </div>

            <div
              style={{
                marginTop: 5,
                color: "#4c1d95",
                fontSize: 12,
                lineHeight: 1.55,
                fontWeight: 750,
              }}
            >
              {projection.growth.guidance}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
