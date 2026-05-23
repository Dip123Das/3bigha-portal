"use client";

import type {
  OperationalWorkloadResult,
} from "@/lib/operational-workload/workload-engine";

function tone(health: OperationalWorkloadResult["health"]) {
  if (health === "critical") {
    return {
      border: "#dc2626",
      bg: "#fff5f5",
      text: "#991b1b",
      badge: "CRITICAL",
    };
  }

  if (health === "high") {
    return {
      border: "#f59e0b",
      bg: "#fffaf0",
      text: "#92400e",
      badge: "HIGH",
    };
  }

  if (health === "moderate") {
    return {
      border: "#facc15",
      bg: "#fefce8",
      text: "#854d0e",
      badge: "MODERATE",
    };
  }

  return {
    border: "#bbf7d0",
    bg: "#f0fdf4",
    text: "#166534",
    badge: "STABLE",
  };
}

export default function OperationalWorkloadPanel({
  data,
}: {
  data: OperationalWorkloadResult;
}) {
  const t = tone(data.health);

  return (
    <section
      style={{
        border: `1px solid ${t.border}`,
        background: t.bg,
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            Operational workload balance
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 13,
              color: "#475569",
              lineHeight: 1.5,
            }}
          >
            {data.summary}
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${t.border}`,
            background: "#ffffff",
            color: t.text,
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          {t.badge}
        </div>
      </div>

      {data.signals.length ? (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gap: 8,
          }}
        >
          {data.signals.map((signal, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 10,
                background: "#ffffff",
                padding: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  {signal.label}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#0f172a",
                  }}
                >
                  {signal.value}
                </div>
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "#64748b",
                  lineHeight: 1.45,
                }}
              >
                {signal.detail}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          fontWeight: 800,
          color: "#334155",
        }}
      >
        Recommended operational approach: {data.recommendation}
      </div>
    </section>
  );
}
