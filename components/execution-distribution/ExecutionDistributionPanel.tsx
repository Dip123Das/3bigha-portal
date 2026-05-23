"use client";

import type {
  ExecutionDistributionResult,
} from "@/lib/execution-distribution/distribution-engine";

function tone(
  pressure: ExecutionDistributionResult["pressure"]
) {
  if (pressure === "critical") {
    return {
      border: "#dc2626",
      bg: "#fff5f5",
      text: "#991b1b",
      badge: "CRITICAL",
    };
  }

  if (pressure === "overloaded") {
    return {
      border: "#f59e0b",
      bg: "#fffaf0",
      text: "#92400e",
      badge: "OVERLOADED",
    };
  }

  if (pressure === "elevated") {
    return {
      border: "#facc15",
      bg: "#fefce8",
      text: "#854d0e",
      badge: "ELEVATED",
    };
  }

  return {
    border: "#bbf7d0",
    bg: "#f0fdf4",
    text: "#166534",
    badge: "STABLE",
  };
}

export default function ExecutionDistributionPanel({
  data,
}: {
  data: ExecutionDistributionResult;
}) {
  const t = tone(data.pressure);

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
            Adaptive execution distribution
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 13,
              lineHeight: 1.5,
              color: "#475569",
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

      {data.bottlenecks.length ? (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {data.bottlenecks.map((b, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 999,
                background: "#ffffff",
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 800,
                color: "#334155",
              }}
            >
              {b}
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gap: 8,
        }}
      >
        {data.recommendations.map((r, idx) => (
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
                fontSize: 13,
                fontWeight: 900,
                color: "#111827",
              }}
            >
              {r.title}
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                lineHeight: 1.45,
                color: "#64748b",
              }}
            >
              {r.detail}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
