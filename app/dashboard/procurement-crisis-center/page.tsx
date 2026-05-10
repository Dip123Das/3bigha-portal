"use client";

import { useEffect, useState } from "react";

type Crisis = {
  level: string;
  healthScore: number;
  operationalThreat: number;
  criticalThreads: number;
  criticalSignals: number;
};

function levelClass(level?: string) {
  if (level === "critical") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (level === "high-risk") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (level === "elevated") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default function ProcurementCrisisCenterPage() {
  const [crisis, setCrisis] =
    useState<Crisis | null>(null);

  const [directives, setDirectives] = useState<
    string[]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          "/api/ai/procurement-crisis-center"
        );

        const json = await res.json();

        if (json?.ok) {
          setCrisis(json.crisis || null);

          setDirectives(
            Array.isArray(json.directives)
              ? json.directives
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
      <div className="mx-auto max-w-7xl p-6">
        Loading procurement crisis center...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="rounded-[2rem] bg-gradient-to-r from-rose-950 via-slate-950 to-indigo-950 p-8 text-white shadow-2xl">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-rose-200">
          Enterprise Procurement Crisis Center
        </div>

        <h1 className="mt-3 text-5xl font-black">
          AI Operational Threat Intelligence
        </h1>

        <p className="mt-4 max-w-4xl text-sm font-medium text-slate-200">
          Executive AI system for procurement crisis
          escalation, operational threat analysis and
          autonomous recovery intelligence.
        </p>
      </div>

      {crisis ? (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Crisis Level
              </div>

              <div
                className={`mt-4 inline-flex rounded-full border px-4 py-2 text-sm font-black uppercase ${levelClass(
                  crisis.level
                )}`}
              >
                {crisis.level}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Health Score
              </div>

              <div className="mt-4 text-5xl font-black text-slate-950">
                {crisis.healthScore}
              </div>
            </div>

            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-rose-500">
                Threat Score
              </div>

              <div className="mt-4 text-5xl font-black text-rose-700">
                {crisis.operationalThreat}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-600">
                Critical Threads
              </div>

              <div className="mt-4 text-5xl font-black text-amber-700">
                {crisis.criticalThreads}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                Critical Signals
              </div>

              <div className="mt-4 text-5xl font-black text-blue-700">
                {crisis.criticalSignals}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/dashboard/procurement-mission-control"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Open Mission Control
            </a>

            <a
              href="/dashboard/procurement-war-room"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
            >
              Open War Room
            </a>

            <a
              href="/dashboard/procurement-situation-room"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
            >
              Open Situation Room
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}