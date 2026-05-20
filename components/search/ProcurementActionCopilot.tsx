"use client";

import Link from "next/link";
import type { ProcurementActionCopilotInsight } from "@/lib/search/procurement-action-copilot";

export default function ProcurementActionCopilot({
  insight,
}: {
  insight: ProcurementActionCopilotInsight;
}) {
  if (!insight.show || !insight.actions.length) return null;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #111827, #4338ca)",
        color: "#ffffff",
        borderRadius: 20,
        padding: 16,
        display: "grid",
        gap: 14,
        boxShadow: "0 18px 42px rgba(15,23,42,0.14)",
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 950, color: "rgba(255,255,255,0.72)" }}>
          Procurement Action Copilot
        </div>

        <div style={{ marginTop: 4, fontSize: 22, fontWeight: 1000 }}>
          🚀 {insight.title}
        </div>

        <div style={{ marginTop: 6, color: "rgba(255,255,255,0.82)", fontWeight: 750, lineHeight: 1.55 }}>
          {insight.subtitle}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {insight.actions.map((action) => (
          <Link
            key={`${action.title}-${action.href}`}
            href={action.href}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 16,
              padding: 12,
              textDecoration: "none",
              color: "#ffffff",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong style={{ fontSize: 14, fontWeight: 1000 }}>
                {action.icon} {action.title}
              </strong>
              <span
                style={{
                  borderRadius: 999,
                  background:
                    action.priority === "High"
                      ? "rgba(34,197,94,0.22)"
                      : action.priority === "Medium"
                        ? "rgba(251,191,36,0.22)"
                        : "rgba(255,255,255,0.14)",
                  padding: "4px 7px",
                  fontSize: 10,
                  fontWeight: 950,
                  height: "fit-content",
                  whiteSpace: "nowrap",
                }}
              >
                {action.priority}
              </span>
            </div>

            <span style={{ color: "rgba(255,255,255,0.78)", fontSize: 12, lineHeight: 1.5, fontWeight: 750 }}>
              {action.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}