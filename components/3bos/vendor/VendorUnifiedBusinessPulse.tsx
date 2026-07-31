import type {
  VendorWorkspaceProjection,
  VendorWorkspaceTone,
} from "@/lib/3bos/vendor/resolve-vendor-workspace-projection";

type VendorUnifiedBusinessPulseProps = {
  projection: VendorWorkspaceProjection;
};

type PulseItem = {
  key: string;
  label: string;
  detail: string;
  value: number;
  href: string;
  tone: VendorWorkspaceTone;
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

function getSignalTone(value: number, positive = false): VendorWorkspaceTone {
  if (value <= 0) return "neutral";
  return positive ? "positive" : "attention";
}

export default function VendorUnifiedBusinessPulse({
  projection,
}: VendorUnifiedBusinessPulseProps) {
  const pulseItems: PulseItem[] = [
    {
      key: "new-requirements",
      label: "New requirements",
      detail: "Buyer requirements waiting for review.",
      value: projection.pulse.newLeads,
      href: "/dashboard/vendor/rfqs",
      tone: getSignalTone(projection.pulse.newLeads),
    },
    {
      key: "buyer-conversations",
      label: "Buyer conversations",
      detail: "Unread discussions that may need a reply.",
      value: projection.pulse.unreadConversations,
      href: "/dashboard/vendor/inbox",
      tone: getSignalTone(projection.pulse.unreadConversations),
    },
    {
      key: "ready-deals",
      label: "Ready deals",
      detail: "Deals showing strong closing readiness.",
      value: projection.pulse.readyDeals,
      href: "/dashboard/vendor/enquiries",
      tone: getSignalTone(projection.pulse.readyDeals, true),
    },
    {
      key: "missed-follow-ups",
      label: "Follow-ups",
      detail: "Leads that may need faster attention.",
      value: projection.pulse.missedLeads,
      href: "/dashboard/vendor/rfqs",
      tone: getSignalTone(projection.pulse.missedLeads),
    },
    {
      key: "vendor-alerts",
      label: "Vendor alerts",
      detail: "Important operational notifications.",
      value: projection.pulse.alerts,
      href: "/dashboard/vendor/notifications",
      tone: getSignalTone(projection.pulse.alerts),
    },
    {
      key: "price-signals",
      label: "Price signals",
      detail: "Recent market or price activity to review.",
      value: projection.pulse.priceSignals,
      href: "/vendor/price-updates/new",
      tone: getSignalTone(projection.pulse.priceSignals),
    },
  ];

  const activeSignalCount = pulseItems.filter((item) => item.value > 0).length;

  const performanceItems = [
    {
      label: "Marketplace visibility",
      value: projection.performance.visibilityScore,
    },
    {
      label: "Reply performance",
      value: projection.performance.replyRate,
    },
    {
      label: "Deal conversion",
      value: projection.performance.closeRate,
    },
  ];

  return (
    <section
      aria-labelledby="vendor-unified-business-pulse-title"
      data-v3-unified-business-pulse="active"
      data-v3-active-signal-count={activeSignalCount}
      style={{
        marginBottom: 16,
        overflow: "hidden",
        border: "1px solid #ddd6fe",
        borderRadius: 24,
        background:
          "linear-gradient(135deg, rgba(245,243,255,0.98), rgba(255,255,255,0.98) 58%, rgba(239,246,255,0.96))",
        boxShadow: "0 12px 30px rgba(109,40,217,0.07)",
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
          borderBottom: "1px solid #ede9fe",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 460px" }}>
          <div
            style={{
              color: "#6d28d9",
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Unified Business Pulse
          </div>

          <h2
            id="vendor-unified-business-pulse-title"
            style={{
              margin: "7px 0 0",
              color: "#0f172a",
              fontSize: "clamp(22px, 2.5vw, 30px)",
              lineHeight: 1.2,
              fontWeight: 950,
            }}
          >
            What is happening in my business?
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
            Review live business activity in one place. Open a signal only
            when human attention or a business decision is required.
          </p>
        </div>

        <div
          style={{
            flex: "0 0 auto",
            minWidth: 170,
            padding: 13,
            border: "1px solid #ddd6fe",
            borderRadius: 16,
            background: "#ffffff",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#6d28d9",
              fontSize: 28,
              lineHeight: 1,
              fontWeight: 950,
            }}
          >
            {activeSignalCount}
          </div>

          <div
            style={{
              marginTop: 6,
              color: "#64748b",
              fontSize: 11,
              fontWeight: 850,
            }}
          >
            active business signals
          </div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
            gap: 11,
          }}
        >
          {pulseItems.map((item) => {
            const tone = getToneStyle(item.tone);

            return (
              <a
                key={item.key}
                href={item.href}
                data-business-pulse-key={item.key}
                style={{
                  display: "block",
                  minWidth: 0,
                  padding: 14,
                  border: `1px solid ${tone.border}`,
                  borderRadius: 17,
                  background: tone.background,
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      color: "#0f172a",
                      fontSize: 13,
                      lineHeight: 1.4,
                      fontWeight: 950,
                    }}
                  >
                    {item.label}
                  </span>

                  <strong
                    style={{
                      color: tone.accent,
                      fontSize: 24,
                      lineHeight: 1,
                      fontWeight: 950,
                    }}
                  >
                    {item.value}
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: 7,
                    color: "#475569",
                    fontSize: 12,
                    lineHeight: 1.5,
                    fontWeight: 700,
                  }}
                >
                  {item.detail}
                </div>

                <div
                  style={{
                    marginTop: 9,
                    color: tone.accent,
                    fontSize: 11,
                    fontWeight: 950,
                  }}
                >
                  Review →
                </div>
              </a>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 15,
            padding: 15,
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: 10,
              fontWeight: 950,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Business health indicators
          </div>

          <div
            style={{
              marginTop: 11,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
              gap: 11,
            }}
          >
            {performanceItems.map((item) => (
              <div key={item.label}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      color: "#475569",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {item.label}
                  </span>

                  <strong
                    style={{
                      color: "#0f172a",
                      fontSize: 16,
                      fontWeight: 950,
                    }}
                  >
                    {item.value}%
                  </strong>
                </div>

                <div
                  aria-hidden="true"
                  style={{
                    marginTop: 7,
                    height: 6,
                    overflow: "hidden",
                    borderRadius: 999,
                    background: "#e2e8f0",
                  }}
                >
                  <div
                    style={{
                      width: `${item.value}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "#7c3aed",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
