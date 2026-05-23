"use client";

import type {
  StabilizationResult,
} from "@/lib/stabilization-intelligence/stabilization-engine";

function tone(state: StabilizationResult["state"]) {
  if (state === "critical") return { border: "#dc2626", bg: "#fff5f5", text: "#991b1b", badge: "CRITICAL" };
  if (state === "stabilize") return { border: "#f59e0b", bg: "#fffaf0", text: "#92400e", badge: "STABILIZE" };
  if (state === "watch") return { border: "#facc15", bg: "#fefce8", text: "#854d0e", badge: "WATCH" };
  return { border: "#bbf7d0", bg: "#f0fdf4", text: "#166534", badge: "STABLE" };
}

export default function StabilizationPanel({
  data,
}: {
  data: StabilizationResult;
}) {
  const t = tone(data.state);

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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>
            Autonomous stabilization intelligence
          </div>
          <div style={{ marginTop: 5, fontSize: 13, lineHeight: 1.5, color: "#475569" }}>
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

      {data.riskPatterns.length ? (
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {data.riskPatterns.map((pattern, idx) => (
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
              {pattern}
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {data.stabilizationSteps.map((step, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              background: "#ffffff",
              padding: 10,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
              {step.title}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.45, color: "#64748b" }}>
              {step.detail}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
