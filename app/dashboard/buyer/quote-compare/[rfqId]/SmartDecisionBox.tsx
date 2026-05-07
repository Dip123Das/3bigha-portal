"use client";

import { useState } from "react";

function pillStyle(tone: "ok" | "warn" | "bad" | "neutral" = "neutral") {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "#fff",
    color: "#111827",
    whiteSpace: "nowrap",
  };

  if (tone === "ok") return { ...base, borderColor: "#bbf7d0", background: "#ecfdf5", color: "#065f46" };
  if (tone === "warn") return { ...base, borderColor: "#fde68a", background: "#fffbeb", color: "#92400e" };
  if (tone === "bad") return { ...base, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" };
  return { ...base, borderColor: "#e5e7eb", background: "#f8fafc", color: "#111827" };
}

export default function SmartDecisionBox({ payload }: { payload: any }) {
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<any>(null);
  const [error, setError] = useState("");

  async function runSmartDecision() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/ai/smart-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Smart Decision AI failed.");
      }

      setDecision(data);
    } catch (e: any) {
      setError(e?.message || "Smart Decision AI failed.");
    } finally {
      setLoading(false);
    }
  }

  const riskTone =
    decision?.riskLevel === "low" ? "ok" : decision?.riskLevel === "high" ? "bad" : "warn";

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        border: "1px solid #c7d2fe",
        background: "linear-gradient(135deg, #eef2ff, #ffffff)",
        boxShadow: "0 10px 24px rgba(79,70,229,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 950, color: "#4338ca" }}>
            🧠 Smart Decision AI
          </div>
          <div style={{ marginTop: 5, fontSize: 13, color: "#475569", fontWeight: 800 }}>
            Analyze vendor quotes, price, risk, urgency and recommend the best next action.
          </div>
        </div>

        <button
          type="button"
          onClick={runSmartDecision}
          disabled={loading}
          style={{
            height: 40,
            padding: "0 16px",
            borderRadius: 999,
            border: "1px solid #4f46e5",
            background: loading ? "#e0e7ff" : "#4f46e5",
            color: loading ? "#3730a3" : "#fff",
            fontWeight: 1000,
            cursor: loading ? "default" : "pointer",
            boxShadow: "0 8px 18px rgba(79,70,229,0.22)",
          }}
        >
          {loading ? "Thinking..." : "Run Smart Decision"}
        </button>
      </div>

      {error ? (
        <div style={{ marginTop: 12, color: "#991b1b", fontWeight: 900 }}>
          {error}
        </div>
      ) : null}

      {decision ? (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={pillStyle("ok")}>Confidence: {decision.confidence ?? "—"}%</span>
            <span style={pillStyle(riskTone as any)}>Risk: {decision.riskLevel ?? "—"}</span>
            <span style={pillStyle("neutral")}>Savings: {decision.savingsPotential ?? 0}%</span>
            <span style={pillStyle("neutral")}>Source: {decision.source ?? "—"}</span>
          </div>

          <div style={{ fontSize: 18, fontWeight: 1000 }}>
            ⭐ Best Vendor:{" "}
            {decision.bestVendor?.vendor_business_name ||
              decision.bestVendor?.business_name ||
              decision.bestVendor?.name ||
              (decision.bestVendor?.vendor_id
                ? `Vendor ${String(decision.bestVendor.vendor_id).slice(0, 8)}…`
                : "Not enough data")}
          </div>

          <div style={{ fontSize: 13, color: "#334155", fontWeight: 800 }}>
            <strong>Recommended Action:</strong> {decision.recommendedAction}
          </div>

          <div style={{ fontSize: 13, color: "#334155", fontWeight: 800 }}>
            <strong>Negotiation Advice:</strong> {decision.negotiationAdvice}
          </div>

          <div style={{ fontSize: 13, color: "#334155", fontWeight: 800 }}>
            <strong>Market Situation:</strong> {decision.marketSituation}
          </div>

          <div style={{ fontSize: 13, color: "#334155", fontWeight: 800 }}>
            <strong>Urgency Advice:</strong> {decision.urgencyAdvice}
          </div>

          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
            {decision.aiReasoning}
          </div>
        </div>
      ) : null}
    </div>
  );
}