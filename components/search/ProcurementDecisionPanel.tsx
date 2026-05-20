"use client";

import Link from "next/link";
import type { ProcurementDecisionInsight } from "@/lib/search/procurement-decision-engine";

export default function ProcurementDecisionPanel({
  insight,
}: {
  insight: ProcurementDecisionInsight;
}) {
  if (!insight.show) return null;

  const bg =
    insight.readinessScore >= 85
      ? "linear-gradient(135deg, #064e3b, #047857)"
      : insight.readinessScore >= 68
        ? "linear-gradient(135deg, #172554, #2563eb)"
        : insight.readinessScore >= 45
          ? "linear-gradient(135deg, #422006, #d97706)"
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
            Procurement Decision Intelligence
          </div>
          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 1000 }}>
            🧠 {insight.title}
          </div>
          <div style={{ marginTop: 6, color: "rgba(255,255,255,0.82)", fontWeight: 750, lineHeight: 1.55 }}>
            RFQ success probability is estimated at {insight.rfqSuccessProbability}%. Recommended vendor count:{" "}
            {insight.recommendedVendorCount}.
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
          <div style={{ fontSize: 28, fontWeight: 1000 }}>{insight.readinessScore}</div>
          <div style={{ fontSize: 11, fontWeight: 950, color: "rgba(255,255,255,0.76)" }}>
            {insight.readinessLabel} readiness
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
          ["Complexity", insight.complexity],
          ["Response", insight.responseSpeed],
          ["Vendors", insight.recommendedVendorCount],
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
            <div style={{ fontSize: 18, fontWeight: 1000 }}>{value}</div>
            <div style={{ marginTop: 2, fontSize: 12, fontWeight: 850, color: "rgba(255,255,255,0.74)" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {insight.signals.map((signal) => (
          <span
            key={signal}
            style={{
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 10px",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {signal}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href={insight.bestActionHref}
          className="topBtn"
          style={{
            textDecoration: "none",
            background: "#ffffff",
            color: "#0f172a",
            border: "1px solid rgba(255,255,255,0.75)",
          }}
        >
          ⚡ {insight.bestAction}
        </Link>

        <Link
          href={insight.secondaryHref}
          className="topBtn topBtnGhost"
          style={{
            textDecoration: "none",
            background: "rgba(255,255,255,0.12)",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.20)",
          }}
        >
          🎯 Discover Vendors
        </Link>
      </div>
    </div>
  );
}