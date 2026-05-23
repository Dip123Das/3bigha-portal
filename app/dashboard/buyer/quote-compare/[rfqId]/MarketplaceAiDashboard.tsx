"use client";

import { useState } from "react";

function pillStyle(tone: "ok" | "warn" | "bad" | "neutral" = "neutral"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
  };

  if (tone === "ok") return { ...base, borderColor: "#bbf7d0", background: "#ecfdf5", color: "#065f46" };
  if (tone === "warn") return { ...base, borderColor: "#fde68a", background: "#fffbeb", color: "#92400e" };
  if (tone === "bad") return { ...base, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" };
  return base;
}

export default function MarketplaceAiDashboard({ payload }: { payload: any }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  async function runAiDashboard() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/ai/marketplace-orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: payload,
          options: {
            smartDecision: true,
            pricePrediction: true,
            rfqIntelligence: true,
            quoteRisk: true,
          },
        }),
      });

      const json = await res.json();

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Marketplace AI failed.");
      }

      setData(json);
    } catch (e: any) {
      setError(e?.message || "Marketplace AI failed.");
    } finally {
      setLoading(false);
    }
  }

  const summary = data?.summary || {};
  const intel = data?.intelligence || {};
  const risk = summary?.riskLevel || intel?.quoteRisk?.riskLevel || "unknown";
  const riskTone = risk === "low" ? "ok" : risk === "high" ? "bad" : risk === "medium" ? "warn" : "neutral";

  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 18,
        border: "1px solid #ddd6fe",
        background: "#ffffff",
        boxShadow: "0 12px 28px rgba(109,40,217,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#6d28d9" }}>
            🧠 Marketplace AI Dashboard
          </div>
          <div style={{ marginTop: 5, fontSize: 13, color: "#475569", fontWeight: 800 }}>
            Runs Smart Decision, RFQ Health, Price Prediction and Quote Risk together.
          </div>
        </div>

        <button
          type="button"
          onClick={runAiDashboard}
          disabled={loading}
          style={{
            height: 40,
            padding: "0 16px",
            borderRadius: 12,
            border: "1px solid #7c3aed",
            background: loading ? "#ede9fe" : "#7c3aed",
            color: loading ? "#5b21b6" : "#fff",
            fontWeight: 800,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Analyzing..." : "Run Marketplace AI"}
        </button>
      </div>

      {error ? <div style={{ marginTop: 12, color: "#991b1b", fontWeight: 900 }}>{error}</div> : null}

      {data ? (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={pillStyle("ok")}>Confidence: {summary.confidence ?? "—"}%</span>
            <span style={pillStyle(riskTone as any)}>Risk: {risk}</span>
            <span style={pillStyle("neutral")}>RFQ Health: {intel?.rfqIntelligence?.rfqHealthScore ?? "—"}/100</span>
            <span style={pillStyle("neutral")}>Price: {intel?.pricePrediction?.direction ?? "—"}</span>
          </div>

          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
            🎯 {summary.decisionLabel || "AI marketplace decision ready"}
          </div>

          <div style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>
            <strong>Recommended Action:</strong> {summary.recommendedAction}
          </div>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div style={{ padding: 12, borderRadius: 12, background: "#fff", border: "1px solid #e5e7eb" }}>
              <strong>📊 RFQ Intelligence</strong>
              <div style={{ marginTop: 6, fontSize: 13 }}>{intel?.rfqIntelligence?.aiSummary || "—"}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                Expected replies: {intel?.rfqIntelligence?.expectedVendorReplies ?? "—"}
              </div>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: "#fff", border: "1px solid #e5e7eb" }}>
              <strong>📈 Price Prediction</strong>
              <div style={{ marginTop: 6, fontSize: 13 }}>{intel?.pricePrediction?.prediction || "—"}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                {intel?.pricePrediction?.recommendation || ""}
              </div>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: "#fff", border: "1px solid #e5e7eb" }}>
              <strong>⚠ Quote Risk</strong>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                {intel?.quoteRisk?.riskReasons?.[0] || "No major risk detected from available data."}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                Score: {intel?.quoteRisk?.riskScore ?? "—"}/100
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}