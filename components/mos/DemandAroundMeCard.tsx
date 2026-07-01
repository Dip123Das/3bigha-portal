"use client";

import { useEffect, useState } from "react";

type DemandAroundMe = {
  demand: {
    todayRfqs: number;
    activeBuyers: number;
    estimatedMarketValue: number;
    fastestGrowingCategory?: string;
    highestDemandArea?: string;
  };
  opportunity: {
    score: number;
    summary: string;
  };
  recommendation: {
    title: string;
    description: string;
  };
};

export default function DemandAroundMeCard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DemandAroundMe | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/mos/demand-around-me", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!cancelled && json?.ok && json?.data) {
          setData(json.data);
        }
      } catch {
        // MOS card must never break vendor dashboard.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ marginBottom: 16, borderRadius: 18, padding: 16, border: "1px solid #dbeafe", background: "#ffffff", boxShadow: "0 10px 24px rgba(37,99,235,.08)" }}>
      <div style={{ fontSize: 20, fontWeight: 950, color: "#1d4ed8" }}>
        📍 Demand Around Me
      </div>

      {loading ? (
        <div style={{ marginTop: 12, color: "#64748b", fontWeight: 800 }}>Loading marketplace intelligence...</div>
      ) : !data ? (
        <div style={{ marginTop: 12, color: "#64748b", fontWeight: 800 }}>Marketplace intelligence unavailable.</div>
      ) : (
        <>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 10 }}>
            <div><b>Today RFQs</b><br />{data.demand.todayRfqs}</div>
            <div><b>Active Buyers</b><br />{data.demand.activeBuyers}</div>
            <div><b>Market Value</b><br />₹{Number(data.demand.estimatedMarketValue || 0).toLocaleString("en-IN")}</div>
            <div><b>Opportunity</b><br />{data.opportunity.score}/100</div>
          </div>

          <div style={{ marginTop: 10, color: "#334155", fontWeight: 800 }}>
            Top Category: {data.demand.fastestGrowingCategory || "—"} · Area: {data.demand.highestDemandArea || "—"}
          </div>

          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#eff6ff", color: "#1e3a8a", fontWeight: 850 }}>
            <div>{data.recommendation.title}</div>
            <div style={{ marginTop: 4, fontSize: 13 }}>{data.recommendation.description}</div>
          </div>
        </>
      )}
    </div>
  );
}
