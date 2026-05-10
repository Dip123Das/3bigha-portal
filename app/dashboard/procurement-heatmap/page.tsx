"use client";

import { useEffect, useState } from "react";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import LiveProcurementRefreshBadge from "@/app/components/procurement/LiveProcurementRefreshBadge";
import ProcurementLiveTicker from "@/app/components/procurement/ProcurementLiveTicker";
import ProcurementHeatmapIntelligence from "@/app/components/procurement/ProcurementHeatmapIntelligence";

export default function ProcurementHeatmapPage() {
  const [live, setLive] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const load = () => {
      Promise.all([
        fetch("/api/ai/procurement-live-events").then((r) => r.json()),
        fetch("/api/ai/procurement-timeline").then((r) => r.json()),
      ])
        .then(([liveData, timelineData]) => {
          if (!mounted) return;
          setLive(liveData);
          setTimeline(timelineData);
        })
        .catch(() => {
          if (!mounted) return;
          setLive({ ok: false });
          setTimeline({ ok: false });
        });
    };

    load();

    const timer = window.setInterval(load, 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const liveEvents = Array.isArray(live?.events) ? live.events : [];
  const timelineSteps = Array.isArray(timeline?.steps) ? timeline.steps : [];

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-orange-950 to-rose-950 p-10 text-white shadow-2xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            AI Procurement Heatmap Intelligence
          </div>

          <h1 className="mt-6 text-5xl font-black">
            Procurement Heatmap Command Center
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Detect hottest procurement categories, active RFQ zones, supplier
            density, negotiation pressure clusters and procurement risk hotspots.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold text-slate-100">
            AI is mapping live procurement pressure from RFQ, chat, timeline and
            supplier-side activity signals.
          </div>
        </div>

        <div className="mt-8">
          <ProcurementCommandCenterNav />
        </div>

        <div className="mt-6">
          <LiveProcurementRefreshBadge label="Heatmap auto-refresh" />
        </div>

        <div className="mt-6">
          <ProcurementLiveTicker />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="Live Events" value={live?.summary?.total || 0} />
          <Stat label="Critical Heat" value={live?.summary?.critical || 0} />
          <Stat label="High Pressure" value={live?.summary?.high || 0} />
          <Stat label="Timeline Signals" value={timeline?.summary?.total || 0} />
        </div>

        <div className="mt-8">
          <ProcurementHeatmapIntelligence
            liveEvents={liveEvents}
            timelineSteps={timelineSteps}
          />
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
    </div>
  );
}