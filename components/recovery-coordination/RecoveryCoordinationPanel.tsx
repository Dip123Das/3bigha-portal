"use client";

import type {
  RecoveryCoordinationResult,
} from "@/lib/recovery-coordination/recovery-engine";

function tone(urgency: RecoveryCoordinationResult["urgency"]) {
  if (urgency === "urgent") return { border: "#dc2626", bg: "#fff5f5", text: "#991b1b", badge: "URGENT" };
  if (urgency === "recover") return { border: "#f59e0b", bg: "#fffaf0", text: "#92400e", badge: "RECOVER" };
  if (urgency === "monitor") return { border: "#facc15", bg: "#fefce8", text: "#854d0e", badge: "MONITOR" };
  return { border: "#bbf7d0", bg: "#f0fdf4", text: "#166534", badge: "STABLE" };
}

export default function RecoveryCoordinationPanel({
  data,
}: {
  data: RecoveryCoordinationResult;
}) {
  const t = tone(data.urgency);

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
            Autonomous recovery coordination
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

      {data.stalledSignals.length ? (
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {data.stalledSignals.map((signal, idx) => (
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
              {signal}
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {data.recoverySteps.map((step, idx) => (
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
