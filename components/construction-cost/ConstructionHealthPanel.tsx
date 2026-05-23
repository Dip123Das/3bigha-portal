"use client";

import type { ConstructionProjectHealth } from "@/lib/construction-cost/project-health-engine";

type Props = {
  health: ConstructionProjectHealth | null;
  loading?: boolean;
};

export default function ConstructionHealthPanel({ health, loading = false }: Props) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-black text-slate-950">AI Construction Health</div>
        <p className="mt-2 text-sm text-slate-500">Calculating project health...</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-black text-slate-950">AI Construction Health</div>
        <p className="mt-2 text-sm text-slate-500">No health data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            AI Construction Operations Desk
          </div>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            Project Health Score
          </h3>
        </div>

        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
          <div className="text-3xl font-black">{health.healthScore}</div>
          <div className="text-[11px] font-bold uppercase text-slate-300">
            {health.grade}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-700">{health.summary}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black">{health.delayedCount}</div>
          <div className="text-xs font-bold uppercase text-slate-500">Delayed</div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black">{health.blockedCount}</div>
          <div className="text-xs font-bold uppercase text-slate-500">Blocked</div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black">{health.averageProgress}%</div>
          <div className="text-xs font-bold uppercase text-slate-500">Progress</div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black">{health.executionConfidence}%</div>
          <div className="text-xs font-bold uppercase text-slate-500">Confidence</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-sm font-black text-slate-900">Recommended focus</div>
        <div className="mt-3 space-y-2">
          {health.recommendedFocus.map((item) => (
            <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
