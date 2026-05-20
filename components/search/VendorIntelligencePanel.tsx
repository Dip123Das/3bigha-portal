"use client";

import Link from "next/link";
import type { VendorIntelligenceInsight } from "@/lib/search/vendor-intelligence-engine";

export default function VendorIntelligencePanel({
  insight,
}: {
  insight: VendorIntelligenceInsight;
}) {
  if (!insight.show) return null;

  const bg =
    insight.qualityScore >= 86
      ? "linear-gradient(135deg, #064e3b, #059669)"
      : insight.qualityScore >= 70
        ? "linear-gradient(135deg, #172554, #2563eb)"
        : insight.qualityScore >= 48
          ? "linear-gradient(135deg, #581c87, #7c3aed)"
          : "linear-gradient(135deg, #334155, #0f172a)";

  return (
    <div
      style={{
        background: bg,
        color: "#ffffff",
        borderRadius: 20,
        padding: 16,
        display: "grid",
        gap: 14,
        boxShadow: "0 18px 42px rgba(15,23,42,0.14)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 950, color: "rgba(255,255,255,0.72)" }}>
            Unified Vendor Intelligence Layer
          </div>

          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 1000 }}>
            🏅 {insight.title}
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
          <div style={{ fontSize: 28, fontWeight: 1000 }}>{insight.qualityScore}</div>
          <div style={{ fontSize: 11, fontWeight: 950, color: "rgba(255,255,255,0.76)" }}>
            {insight.reliabilityLabel} vendor score
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
          ["Best Vendor", insight.bestVendorType],
          ["Response", insight.responseConfidence],
          ["Fit", insight.procurementFit],
          ["Locality", insight.localityStrength],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 16,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 1000, lineHeight: 1.35 }}>{value}</div>
            <div style={{ marginTop: 5, fontSize: 11, fontWeight: 850, color: "rgba(255,255,255,0.74)" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {insight.badges.map((badge) => (
          <span
            key={badge}
            style={{
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 10px",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {badge}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href={insight.vendorHref}
          className="topBtn"
          style={{
            textDecoration: "none",
            background: "#ffffff",
            color: "#0f172a",
            border: "1px solid rgba(255,255,255,0.75)",
          }}
        >
          🎯 View Best Vendors
        </Link>

        <Link
          href={insight.rfqHref}
          className="topBtn topBtnGhost"
          style={{
            textDecoration: "none",
            background: "rgba(255,255,255,0.12)",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.20)",
          }}
        >
          ⚡ Send RFQ
        </Link>
      </div>
    </div>
  );
}