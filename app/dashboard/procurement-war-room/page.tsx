"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import GlobalAiOperationalStatus from "@/components/ai-operational/GlobalAiOperationalStatus";
import OperationalRecoveryFeed from "@/components/ai-operational/OperationalRecoveryFeed";

type WarRoomData = {
  healthScore: number;
  healthStatus: string;
  criticalThreads: number;
  criticalSignals: number;
  executiveDirective: string;
  executionMode: string;
};

export default function ProcurementWarRoomPage() {
  const [data, setData] = useState<WarRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [compactMode, setCompactMode] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          "/api/ai/procurement-daily-briefing"
        );

        const json = await res.json();

        if (json?.ok) {
          setData(json.briefing || null);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="w-full p-4 md:p-5">
      <div className="mb-6 space-y-4">
        <GlobalAiOperationalStatus
          battlefieldPulse="strained"
          procurementPressure="high_pressure"
          economicStress="tightening"
          supplyChainRisk="watch"
          orchestrationState="strained"
        />

        <OperationalRecoveryFeed />
      </div>
        Loading AI Procurement Priority Work...
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-5">
      <div className="rounded-[1.75rem] bg-gradient-to-r from-slate-950 via-rose-950 to-indigo-950 p-4 md:p-7 text-white shadow-xl">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-rose-200">
          Executive Procurement Priority Work
        </div>

        <h1 className="mt-3 text-3xl md:text-5xl font-black">
          AI Procurement Operations HQ
        </h1>

        <p className="mt-4 max-w-3xl text-sm font-medium text-slate-200">
          Unified executive AI operations center for procurement intelligence,
          workflow recovery and operational execution.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setCompactMode((prev) => !prev)}
            className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/20"
          >
            {compactMode ? "Expanded View" : "Compact View"}
          </button>

          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
            Command Compression Active
          </div>
        </div>
      </div>

      {data ? (
        <>
          <div className={`mt-6 grid gap-3 ${
            compactMode
              ? "grid-cols-2 md:grid-cols-5"
              : "md:grid-cols-5"
          }`}>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Health
              </div>

              <div className="mt-2 text-3xl font-black text-slate-950">
                {data.healthScore}
              </div>

              <div className="mt-2 text-sm font-bold text-rose-600">
                {data.healthStatus}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-rose-500">
                Critical Threads
              </div>

              <div className="mt-2 text-3xl font-black text-rose-700">
                {data.criticalThreads}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-600">
                Critical Signals
              </div>

              <div className="mt-2 text-3xl font-black text-amber-700">
                {data.criticalSignals}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">
                Execution
              </div>

              <div className="mt-2 text-lg font-black text-violet-700">
                {data.executionMode}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                AI Directive
              </div>

              <div className="mt-2 text-xs font-black leading-5 text-blue-800">
                {data.executiveDirective}
              </div>
            </div>
          </div>

          <div className={`mt-6 grid gap-3 ${
            compactMode
              ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
              : "md:grid-cols-5"
          }`}>
            <Link
              href="/dashboard/procurement-mission-control"
              className="rounded-[1.5rem] border border-slate-300 bg-slate-950 p-4 text-white transition hover:scale-[1.01]"
            >
              <div className="text-2xl">🛰️</div>

              <div className="mt-2 text-sm font-black">
                Work Desk
              </div>

              <div className="mt-1 text-xs font-semibold leading-5 text-slate-300">
                Open unified executive HQ
              </div>
            </Link>
                        <Link
              href="/dashboard/procurement-crisis-center"
              className="rounded-[1.5rem] border border-rose-300 bg-rose-100 p-4 transition hover:scale-[1.01]"
            >
              <div className="text-2xl">🔥</div>

              <div className="mt-2 text-sm font-black text-rose-700">
                Issue Escalation
              </div>

              <div className="mt-1 text-xs font-semibold leading-5 text-rose-600">
                Open autonomous crisis escalation engine
              </div>
            </Link>
            <Link
              href="/dashboard/procurement-anomaly"
              className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 transition hover:scale-[1.01]"
            >
              <div className="text-2xl">🚨</div>

              <div className="mt-2 text-sm font-black text-rose-700">
                Critical Anomalies
              </div>

              <div className="mt-1 text-xs font-semibold leading-5 text-rose-600">
                Open procurement risk intelligence
              </div>
            </Link>

            <Link
              href="/dashboard/procurement-actions"
              className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 transition hover:scale-[1.01]"
            >
              <div className="text-2xl">⚡</div>

              <div className="mt-2 text-sm font-black text-amber-700">
                Pending Actions
              </div>

              <div className="mt-1 text-xs font-semibold leading-5 text-amber-600">
                Open autonomous execution actions
              </div>
            </Link>

            <Link
              href="/dashboard/procurement-live"
              className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4 transition hover:scale-[1.01]"
            >
              <div className="text-2xl">📡</div>

              <div className="mt-2 text-sm font-black text-blue-700">
                Live Operations
              </div>

              <div className="mt-1 text-xs font-semibold leading-5 text-blue-600">
                Monitor procurement operations
              </div>
            </Link>

            <Link
              href="/dashboard/procurement-copilot"
              className="rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4 transition hover:scale-[1.01]"
            >
              <div className="text-2xl">🧠</div>

              <div className="mt-2 text-sm font-black text-violet-700">
                Workflow Assistant
              </div>

              <div className="mt-1 text-xs font-semibold leading-5 text-violet-600">
                Ask procurement intelligence
              </div>
            </Link>
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-950 p-8 text-white">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Executive Status
            </div>

            <div className="mt-3 text-xl font-black leading-tight">
              Procurement operations require active
              AI-guided monitoring and escalation.
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}