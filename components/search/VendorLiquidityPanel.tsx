"use client";

import Link from "next/link";
import type { VendorLiquidityInsight } from "@/lib/search/vendor-liquidity-engine";

export default function VendorLiquidityPanel({
  insight,
}: {
  insight: VendorLiquidityInsight;
}) {
  if (!insight.show) return null;

  const tone =
    insight.score >= 85
      ? {
          background: "#ffffff",
          chip: "rgba(255,255,255,0.16)",
        }
      : insight.score >= 68
        ? {
            background: "#ffffff",
            chip: "rgba(255,255,255,0.14)",
          }
        : {
            background: "#ffffff",
            chip: "rgba(255,255,255,0.16)",
          };

  return (
    <div
      style={{
        background: tone.background,
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
            Vendor Liquidity Intelligence
          </div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800 }}>
            🎯 {insight.title}
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
            minWidth: 118,
            textAlign: "center",
            height: "fit-content",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800 }}>{insight.score}</div>
          <div style={{ fontSize: 11, fontWeight: 950, color: "rgba(255,255,255,0.76)" }}>
            {insight.confidenceLabel} liquidity
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
          gap: 10,
        }}
      >
        {[
          ["Active Vendors", insight.activeVendors],
          ["Fast Responders", insight.fastResponders],
          ["Bulk Ready", insight.bulkReadyVendors],
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
            <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
            <div style={{ marginTop: 2, fontSize: 12, fontWeight: 850, color: "rgba(255,255,255,0.74)" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            borderRadius: 12,
            background: tone.chip,
            border: "1px solid rgba(255,255,255,0.18)",
            padding: "7px 10px",
            fontSize: 12,
            fontWeight: 950,
          }}
        >
          {insight.responseEstimate}
        </span>

        {insight.chips.map((chip) => (
          <span
            key={chip}
            style={{
              borderRadius: 12,
              background: tone.chip,
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
          href={insight.vendorHref}
          className="topBtn"
          style={{
            textDecoration: "none",
            background: "#ffffff",
            color: "#0f172a",
            border: "1px solid rgba(255,255,255,0.75)",
          }}
        >
          🎯 Discover Vendors
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