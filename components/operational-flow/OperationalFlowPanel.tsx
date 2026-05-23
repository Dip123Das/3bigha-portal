"use client";

import type { OperationalFlowResult } from "@/lib/operational-flow/flow-optimization-engine";

function tone(health: OperationalFlowResult["health"]) {
  if (health === "blocked") return { border: "#dc2626", bg: "#fff5f5", text: "#991b1b", badge: "BLOCKED" };
  if (health === "congested") return { border: "#f59e0b", bg: "#fffaf0", text: "#92400e", badge: "CONGESTED" };
  if (health === "friction") return { border: "#facc15", bg: "#fefce8", text: "#854d0e", badge: "FRICTION" };
  return { border: "#bbf7d0", bg: "#f0fdf4", text: "#166534", badge: "SMOOTH" };
}

export default function OperationalFlowPanel({ data }: { data: OperationalFlowResult }) {
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>
            Operational flow optimization
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

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {data.optimizationItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              background: "#ffffff",
              padding: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", whiteSpace: "nowrap" }}>
                {item.impact.toUpperCase()}
              </div>
            </div>

            <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.45, color: "#64748b" }}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
