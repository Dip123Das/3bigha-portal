"use client";

import Link from "next/link";
import type { VendorNegotiationInsight } from "@/lib/search/vendor-negotiation-engine";

export default function VendorNegotiationPanel({
  insight,
}: {
  insight: VendorNegotiationInsight;
}) {
  if (!insight.show) return null;

  const bg =
    insight.negotiationScore >= 85
      ? "linear-gradient(135deg, #064e3b, #059669)"
      : insight.negotiationScore >= 68
        ? "linear-gradient(135deg, #172554, #2563eb)"
        : insight.negotiationScore >= 45
          ? "linear-gradient(135deg, #581c87, #7c3aed)"
          : "linear-gradient(135deg, #334155, #0f172a)";

  return (
    <div
      style={{
        background: bg,
        color: "#ffffff",
        borderRadius: 20,
        padding: 12,
        display: "grid",
        gap: 14,
        boxShadow: "0 18px 42px rgba(15,23,42,0.14)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 950, color: "rgba(255,255,255,0.72)" }}>
            Vendor Recommendation & Negotiation Intelligence
          </div>

          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800 }}>
            🤝 {insight.title}
          </div>

          <div style={{ marginTop: 6, color: "rgba(255,255,255,0.82)", fontWeight: 750, lineHeight: 1.55 }}>
            {insight.subtitle}
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            background: "rgba(255,255,255,0.13)",
            padding: "10px 12px",
            minWidth: 124,
            textAlign: "center",
            height: "fit-content",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800 }}>{insight.negotiationScore}</div>
          <div style={{ fontSize: 11, fontWeight: 950, color: "rgba(255,255,255,0.76)" }}>
            {insight.negotiationLabel} negotiation
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        {[
          ["RFQ Acceptance", `${insight.rfqAcceptanceLikelihood}%`],
          ["Risk", insight.procurementRisk],
          ["Vendor Type", insight.recommendedVendorType],
          ["Price Strategy", insight.priceStrategy],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.35 }}>{value}</div>
            <div style={{ marginTop: 5, fontSize: 11, fontWeight: 850, color: "rgba(255,255,255,0.74)" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          borderRadius: 12,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.16)",
          padding: 12,
          fontSize: 13,
          fontWeight: 800,
          lineHeight: 1.55,
        }}
      >
        Recommended strategy: {insight.bestStrategy}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {insight.chips.map((chip) => (
          <span
            key={chip}
            style={{
              borderRadius: 12,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 10px",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {chip}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href={insight.rfqHref}
          className="topBtn"
          style={{
            textDecoration: "none",
            background: "#ffffff",
            color: "#0f172a",
            border: "1px solid rgba(255,255,255,0.75)",
          }}
        >
          ⚡ Send Negotiation RFQ
        </Link>

        <Link
          href={insight.vendorHref}
          className="topBtn topBtnGhost"
          style={{
            textDecoration: "none",
            background: "rgba(255,255,255,0.12)",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.20)",
          }}
        >
          🎯 Compare Vendors
        </Link>
      </div>
    </div>
  );
}