"use client";

import { useEffect, useMemo, useState } from "react";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import LiveProcurementRefreshBadge from "@/app/components/procurement/LiveProcurementRefreshBadge";
import ProcurementLiveTicker from "@/app/components/procurement/ProcurementLiveTicker";
import ProcurementHeatmapIntelligence from "@/app/components/procurement/ProcurementHeatmapIntelligence";

type Step = {
  id: string;
  title: string;
  description: string;
  module: string;
  eventType: string;
  stage:
    | "created"
    | "matched"
    | "engaged"
    | "negotiation"
    | "risk"
    | "conversion"
    | "memory"
    | "closed";
  score: number;
  createdAt: string;
};

function stageClass(stage: string) {
  if (stage === "risk") return "border-rose-200 bg-rose-50 text-rose-800";
  if (stage === "negotiation") return "border-amber-200 bg-amber-50 text-amber-800";
  if (stage === "engaged") return "border-blue-200 bg-blue-50 text-blue-800";
  if (stage === "created") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (stage === "closed") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-violet-200 bg-violet-50 text-violet-800";
}

function fmt(v?: string) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(v));
  } catch {
    return v;
  }
}

export default function ProcurementTimelinePage() {
  const [data, setData] = useState<any>(null);
  const [stage, setStage] = useState("all");
  const [compactMode, setCompactMode] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = () => {
      fetch("/api/ai/procurement-timeline")
        .then((r) => r.json())
        .then((json) => {
          if (mounted) setData(json);
        })
        .catch(() => {
          if (mounted) setData({ ok: false });
        });
    };

    load();

    const timer = window.setInterval(load, 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const steps: Step[] = Array.isArray(data?.steps) ? data.steps : [];

  const filteredSteps = useMemo(() => {
    if (stage === "all") return steps;
    return steps.filter((s) => s.stage === stage);
  }, [steps, stage]);

  const summary = data?.summary || {};

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-4 md:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-950 p-6 md:p-8 text-white shadow-xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            AI Procurement Activity Timeline
          </div>

          <h1 className="mt-5 text-3xl md:text-5xl font-black">
            Procurement Activity Timeline
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Replay RFQ creation, listing views, recommendation clicks, chat
            messages, negotiation signals and procurement memory events in
            chronological order.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-bold text-slate-100">
            {data?.executiveSummary || "Loading procurement timeline replay..."}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCompactMode((prev) => !prev)}
              className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/20"
            >
              {compactMode ? "Expanded View" : "Compact View"}
            </button>

            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
              Timeline Compression Active
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ProcurementCommandCenterNav />
        </div>

        <div className="mt-6">
          <ProcurementLiveTicker />
        </div>

        <div className="mt-6">
          <ProcurementHeatmapIntelligence
            liveEvents={[]}
            timelineSteps={steps}
          />
        </div>

        <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
          <Stat label="Total" value={summary.total || 0} />
          <Stat label="Created" value={summary.created || 0} />
          <Stat label="Matched" value={summary.matched || 0} />
          <Stat label="Engaged" value={summary.engaged || 0} />
          <Stat label="Negotiation" value={summary.negotiation || 0} />
          <Stat label="Risk" value={summary.risk || 0} />
          <Stat label="Memory" value={summary.memory || 0} />
          <Stat label="Closed" value={summary.closed || 0} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["created", "Created"],
            ["matched", "Matched"],
            ["engaged", "Engaged"],
            ["negotiation", "Negotiation"],
            ["risk", "Risk"],
            ["memory", "Memory"],
            ["closed", "Closed"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStage(key)}
              className={`rounded-full px-4 py-2 text-xs font-black transition ${
                stage === key
                  ? "bg-slate-950 text-white"
                  : "border border-slate-300 bg-white text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Chronological Procurement Replay
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Showing {filteredSteps.length} of {steps.length} timeline steps.
              </p>
            </div>

            <LiveProcurementRefreshBadge label="Timeline auto-refresh" />
          </div>

          <div className="mt-6 space-y-3 border-l-2 border-slate-200 pl-4">
            {filteredSteps.length === 0 ? (
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                No procurement timeline events found for this stage.
              </div>
            ) : (
              (compactMode ? filteredSteps.slice(0, 12) : filteredSteps).map((step, index) => (
                <div key={`${step.id}-${index}`} className="relative">
                  <div className="absolute -left-[22px] top-5 h-3 w-3 rounded-full border-2 border-white bg-slate-950 shadow" />

                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${stageClass(
                              step.stage
                            )}`}
                          >
                            {step.stage.toUpperCase()}
                          </span>

                          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                            {step.module}
                          </span>

                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                            {step.eventType.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="mt-3 text-sm font-black text-slate-950">
                          {step.title}
                        </div>

                        <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                          {step.description}
                        </div>
                      </div>

                      <div className="min-w-[120px] text-left md:text-right">
                        <div className="text-xl font-black text-slate-950">
                          {step.score}
                        </div>
                        <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Score
                        </div>
                        <div className="mt-2 text-[11px] font-bold text-slate-500">
                          {fmt(step.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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

      <div className="mt-2 text-xl font-black text-slate-950">{value}</div>
    </div>
  );
}