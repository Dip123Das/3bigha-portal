"use client";

import Link from "next/link";
import type { ProcurementJourneyAction } from "@/lib/procurement/journey-actions";

function toneStyle(tone: ProcurementJourneyAction["tone"]) {
  if (tone === "green") return { background: "#ecfdf5", border: "#bbf7d0", color: "#047857" };
  if (tone === "purple") return { background: "#f5f3ff", border: "#ddd6fe", color: "#5b21b6" };
  if (tone === "amber") return { background: "#fffbeb", border: "#fde68a", color: "#92400e" };
  if (tone === "blue") return { background: "#ffffff", border: "#bfdbfe", color: "#1d4ed8" };
  return { background: "#eef2ff", border: "#c7d2fe", color: "#3730a3" };
}

export default function ProcurementJourneyBar({
  actions,
}: {
  actions: ProcurementJourneyAction[];
}) {
  if (!actions.length) return null;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        background: "#ffffff",
        boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
        padding: "12px",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 950, color: "#0b57d0" }}>
        Procurement Journey Actions
      </div>

      <div style={{ marginTop: 4, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
        Continue your marketplace workflow
      </div>

      <div className="hidden md:block" style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 750 }}>
        Pick up RFQ, vendor discovery, price checking or negotiation from this search.
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {actions.map((action) => {
          const s = toneStyle(action.tone);

          return (
            <Link
              key={action.id}
              href={action.href}
              style={{
                textDecoration: "none",
                border: `1px solid ${s.border}`,
                background: s.background,
                color: s.color,
                borderRadius: 12,
                padding: "9px 11px",
                minWidth: 140,
                flex: "1 1 150px",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800 }}>{action.label}</div>
              <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.45, fontWeight: 750 }}>
                {action.description}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}