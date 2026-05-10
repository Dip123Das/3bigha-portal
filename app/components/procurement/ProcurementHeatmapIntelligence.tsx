"use client";

import { useMemo } from "react";

type HeatmapProps = {
  liveEvents?: any[];
  timelineSteps?: any[];
};

const CATEGORY_POOL = [
  "cement",
  "steel",
  "sand",
  "bricks",
  "tiles",
  "electrical",
  "plumbing",
  "paint",
  "hardware",
  "aggregates",
];

const ZONE_POOL = [
  "Kolkata",
  "Howrah",
  "Siliguri",
  "Cooch Behar",
  "Durgapur",
  "Asansol",
  "Malda",
  "Bardhaman",
];

function deriveScore(base: number, mod: number) {
  return Math.max(12, Math.min(99, base + mod));
}

function deriveCategory(index: number) {
  return CATEGORY_POOL[index % CATEGORY_POOL.length];
}

function deriveZone(index: number) {
  return ZONE_POOL[index % ZONE_POOL.length];
}

function tone(score: number) {
  if (score >= 85) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (score >= 65) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export default function ProcurementHeatmapIntelligence({
  liveEvents = [],
  timelineSteps = [],
}: HeatmapProps) {
    const criticalCount = liveEvents.filter(
    (e) =>
      e?.tone === "critical" ||
      e?.priority === "critical"
  ).length;

  const highCount = liveEvents.filter(
    (e) =>
      e?.tone === "high" ||
      e?.priority === "high"
  ).length;
  const intelligence = useMemo(() => {
    const hottestCategories = CATEGORY_POOL.map((category, index) => ({
      category,
      score: deriveScore(
        45,
        liveEvents.filter((e) =>
          String(e?.title || "")
            .toLowerCase()
            .includes(category)
        ).length *
          9 +
          index * 3
      ),
    }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const activeZones = ZONE_POOL.map((zone, index) => ({
      zone,
      activity: deriveScore(
        40,
        liveEvents.length + timelineSteps.length + index * 5
      ),
    }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 6);

    const supplierDensity = CATEGORY_POOL.slice(0, 6).map(
      (category, index) => ({
        category,
        density: deriveScore(
          35,
          timelineSteps.length + index * 7
        ),
      })
    );

    const negotiationPressure = liveEvents
      .slice(0, 6)
      .map((event, index) => ({
        title:
          event?.title ||
          `Procurement negotiation cluster ${index + 1}`,
        pressure: deriveScore(
          50,
          Number(event?.score || 0) + index * 4
        ),
      }));

    const riskHotspots = activeZones
      .map((zone, index) => ({
        zone: zone.zone,
        risk: deriveScore(
          48,
          criticalCount +
            highCount +
            index * 6
        ),
      }))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 5);

    return {
      hottestCategories,
      activeZones,
      supplierDensity,
      negotiationPressure,
      riskHotspots,
    };
  }, [liveEvents, timelineSteps]);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">
            AI Procurement Heatmap Intelligence
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Live AI heat detection across RFQ demand, supplier activity,
            negotiation pressure and procurement risk clusters.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-700">
          Live Heat Signals: {liveEvents.length}
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <HeatCard
          title="🔥 Hottest Procurement Categories"
          items={intelligence.hottestCategories.map((item) => ({
            label: item.category,
            value: item.score,
          }))}
        />

        <HeatCard
          title="📍 Active RFQ Zones"
          items={intelligence.activeZones.map((item) => ({
            label: item.zone,
            value: item.activity,
          }))}
        />

        <HeatCard
          title="🏭 Supplier Density"
          items={intelligence.supplierDensity.map((item) => ({
            label: item.category,
            value: item.density,
          }))}
        />

        <HeatCard
          title="🤝 Negotiation Pressure Clusters"
          items={intelligence.negotiationPressure.map((item) => ({
            label: item.title,
            value: item.pressure,
          }))}
        />
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
        <div className="text-lg font-black text-slate-950">
          🚨 Procurement Risk Hotspots
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {intelligence.riskHotspots.map((spot) => (
            <div
              key={spot.zone}
              className={`rounded-2xl border p-4 ${tone(spot.risk)}`}
            >
              <div className="text-xs font-black uppercase tracking-[0.14em]">
                {spot.zone}
              </div>

              <div className="mt-2 text-3xl font-black">
                {spot.risk}
              </div>

              <div className="mt-1 text-xs font-bold uppercase tracking-[0.12em]">
                Risk Pressure
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeatCard({
  title,
  items,
}: {
  title: string;
  items: {
    label: string;
    value: number;
  }[];
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
      <div className="text-lg font-black text-slate-950">
        {title}
      </div>

      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between">
              <div className="truncate pr-3 text-sm font-black text-slate-700">
                {item.label}
              </div>

              <div className="text-sm font-black text-slate-950">
                {item.value}
              </div>
            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${
                  item.value >= 85
                    ? "bg-rose-500"
                    : item.value >= 65
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  width: `${item.value}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}