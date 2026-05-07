"use client";

import { useState } from "react";

function badgeStyle(tone: "up" | "down" | "stable" | "neutral" = "neutral"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    color: "#111827",
  };

  if (tone === "up") return { ...base, borderColor: "#fecaca", background: "#fff1f2", color: "#be123c" };
  if (tone === "down") return { ...base, borderColor: "#bbf7d0", background: "#ecfdf5", color: "#047857" };
  if (tone === "stable") return { ...base, borderColor: "#bfdbfe", background: "#eff6ff", color: "#1d4ed8" };
  return base;
}

function money(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return "₹" + n.toLocaleString();
}

export default function PricePredictionToggle({ payload }: { payload: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [error, setError] = useState("");

  async function runPrediction() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (!nextOpen || prediction || loading) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/ai/price-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          module: payload?.module,
          category: payload?.category,
          city: payload?.city,
          locality: payload?.locality,
          currentPrice:
            payload?.priceData?.averagePrice ??
            payload?.priceData?.lowestQuote ??
            null,
          averagePrice: payload?.priceData?.averagePrice ?? null,
          latestPrice: payload?.priceData?.averagePrice ?? null,
          previousPrice: payload?.priceData?.previousPrice ?? null,
          demandScore: payload?.vendors?.length ? Math.min(100, 40 + payload.vendors.length * 8) : 45,
          supplyScore: payload?.vendors?.length ? Math.min(100, 35 + payload.vendors.length * 6) : 50,
          rfqDemand: payload?.vendors?.length ? Math.min(100, 45 + payload.vendors.length * 7) : 50,
        }),
      });

      const json = await res.json();

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Price Prediction AI failed.");
      }

      setPrediction(json);
    } catch (e: any) {
      setError(e?.message || "Price Prediction AI failed.");
    } finally {
      setLoading(false);
    }
  }

  const direction = prediction?.direction || "neutral";
  const icon = direction === "up" ? "📈" : direction === "down" ? "📉" : "➖";

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        border: "1px solid #fed7aa",
        background: "linear-gradient(135deg, #fff7ed, #ffffff)",
        boxShadow: "0 10px 24px rgba(249,115,22,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 1000, color: "#c2410c" }}>
            📈 Price Prediction AI
          </div>
          <div style={{ marginTop: 5, fontSize: 13, color: "#475569", fontWeight: 800 }}>
            Click to check whether buyer should buy now, wait, or negotiate.
          </div>
        </div>

        <button
          type="button"
          onClick={runPrediction}
          disabled={loading}
          style={{
            height: 40,
            padding: "0 16px",
            borderRadius: 999,
            border: "1px solid #f97316",
            background: loading ? "#ffedd5" : "#f97316",
            color: loading ? "#9a3412" : "#fff",
            fontWeight: 1000,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Predicting..." : open ? "Hide Prediction" : "Show Prediction"}
        </button>
      </div>

      {open ? (
        <div style={{ marginTop: 14 }}>
          {error ? (
            <div style={{ color: "#991b1b", fontWeight: 900 }}>{error}</div>
          ) : loading ? (
            <div style={{ color: "#9a3412", fontWeight: 900 }}>AI is checking price trend...</div>
          ) : prediction ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badgeStyle(direction)}>{icon} {prediction.prediction}</span>
                <span style={badgeStyle("neutral")}>Confidence: {prediction.confidence ?? "—"}%</span>
                <span style={badgeStyle("neutral")}>
                  Expected: {money(prediction.expectedRange?.low)} - {money(prediction.expectedRange?.high)}
                </span>
                <span style={badgeStyle("neutral")}>
                  Change: {prediction.expectedChangePercent ?? "—"}%
                </span>
              </div>

              <div style={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>
                Recommended: {prediction.recommendation}
              </div>

              <div style={{ fontSize: 13, fontWeight: 800, color: "#475569" }}>
                {prediction.trendReason}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}