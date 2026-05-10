"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Briefing = {
  healthScore: number;
  healthStatus: string;
  criticalThreads: number;
  criticalSignals: number;
  executionMode: string;
  executiveDirective: string;
  anomalyCount: number;
};

export default function ProcurementBriefingPage() {
  const [data, setData] = useState<Briefing | null>(null);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          "/api/ai/procurement-daily-briefing"
        );

        const json = await res.json();

        if (json?.ok) {
          setData(json.briefing || null);
          setPriorities(
            Array.isArray(json.priorities)
              ? json.priorities
              : []
          );
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        Loading executive procurement briefing...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-950 p-8 text-white shadow-2xl">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-indigo-200">
          Executive Procurement Briefing
        </div>

        <h1 className="mt-3 text-4xl font-black">
          AI Procurement Daily Brief
        </h1>

        <p className="mt-4 max-w-3xl text-sm font-medium text-slate-200">
          Unified executive AI summary of procurement
          operations, risks, execution urgency and
          operational priorities.
        </p>
      </div>

      {data ? (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Health Score
              </div>

              <div className="mt-4 text-5xl font-black text-slate-950">
                {data.healthScore}
              </div>

              <div className="mt-2 text-sm font-bold text-rose-600">
                {data.healthStatus}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Critical Threads
              </div>

              <div className="mt-4 text-5xl font-black text-slate-950">
                {data.criticalThreads}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Critical Signals
              </div>

              <div className="mt-4 text-5xl font-black text-slate-950">
                {data.criticalSignals}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Execution Mode
              </div>

              <div className="mt-4 text-2xl font-black text-rose-600">
                {data.executionMode}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
              Executive Directive
            </div>

            <div className="mt-3 text-xl font-black text-slate-950">
              {data.executiveDirective}
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
              Operational Priorities
            </div>

            <div className="mt-4 space-y-3">
              {priorities.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard/procurement-mission-control"
              className="rounded-full bg-indigo-700 px-5 py-3 text-sm font-black text-white"
            >
              Open Mission Control
            </Link>
            <Link
              href="/dashboard/procurement-health"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Open Health Score
            </Link>

            <Link
              href="/dashboard/procurement-actions"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
            >
              Open AI Actions
            </Link>

            <Link
              href="/dashboard/procurement-live"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
            >
              Open Live Stream
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}