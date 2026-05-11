"use client";

import { useEffect, useState } from "react";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import AutonomousTaskCard from "@/components/procurement/AutonomousTaskCard";

export default function ProcurementAutonomousTasksPage() {
  const [data, setData] = useState<any>(null);
    
  const [recovery, setRecovery] =
    useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/ai/procurement-autonomous-tasks")
        .then((r) => r.json()),

      fetch("/api/ai/procurement-recovery-agent")
        .then((r) => r.json()),
    ]).then(([taskData, recoveryData]) => {
      setData(taskData);
      setRecovery(recoveryData);
    });
  }, []);

  const summary = data?.summary || {};

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-rose-950 to-indigo-950 p-10 text-white shadow-2xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            Autonomous Procurement Execution Tasks
          </div>

          <h1 className="mt-6 text-5xl font-black">
            AI Autonomous Procurement Tasks
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            AI-generated executable procurement recovery actions, escalation
            messages, supplier nudges and workflow recovery tasks.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold text-slate-100">
            {data?.executiveDirective}
          </div>
        </div>

        <div className="mt-8">
          <ProcurementCommandCenterNav />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <Stat label="Total Tasks" value={summary.total || 0} />
          <Stat label="Critical" value={summary.critical || 0} />
          <Stat label="High" value={summary.high || 0} />
          <Stat label="Ready" value={summary.ready || 0} />

          <Stat
            label="Recovery Agent"
            value={recovery?.summary?.total || 0}
          />
        </div>

                <div className="mt-8 rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <div className="text-sm font-black uppercase tracking-[0.14em] text-rose-700">
            Autonomous Supplier Collapse Monitoring
          </div>

          <div className="mt-3 text-2xl font-black text-rose-900">
            AI is actively generating emergency procurement recovery and supplier rerouting tasks.
          </div>

          <div className="mt-4 text-sm font-semibold leading-6 text-rose-800">
            Supplier silence, overload pressure and procurement continuity risks
            are now connected to autonomous execution workflows.
          </div>
        </div>

                <div className="mt-8 rounded-[2rem] border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.14em] text-indigo-700">
                Procurement Recovery Agent
              </div>

              <div className="mt-2 text-3xl font-black text-indigo-950">
                AI Recovery Agent is actively supervising procurement continuity.
              </div>

              <div className="mt-4 text-sm font-semibold leading-6 text-indigo-900">
                Autonomous recovery supervision is now monitoring stale conversations,
                supplier silence and procurement degradation risk.
              </div>
            </div>

            <div className="rounded-2xl border border-white bg-white px-5 py-4 text-sm font-black text-indigo-700">
              Recovery Threads:{" "}
              {recovery?.summary?.total || 0}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {(recovery?.recovery || [])
              .slice(0, 6)
              .map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-[1.5rem] border border-white bg-white p-5"
                >
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                        item.severity ===
                        "critical"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : item.severity ===
                            "high"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                      }`}
                    >
                      {item.severity}
                    </span>

                    <span className="inline-flex rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-black text-white">
                      {item.actionType}
                    </span>
                  </div>

                  <div className="mt-4 text-xl font-black text-slate-950">
                    {item.title}
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      AI Recommendation
                    </div>

                    <div className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                      {item.recommendation}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm font-black text-slate-700">
                    <span>Recovery Confidence</span>
                    <span>{item.confidence}%</span>
                  </div>

                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        item.confidence >= 90
                          ? "bg-rose-500"
                          : item.confidence >= 75
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      style={{
                        width: `${item.confidence}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-800">
                    🤖 {item.actionLabel}
                  </div>
                </div>
              ))}
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
            href="/dashboard/procurement-followup-agent"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Open Follow-up AI
          </a>

          <a
            href="/dashboard/procurement-inbox-actions"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Open Inbox AI
          </a>

          <a
            href="/dashboard/procurement-task-execution-log"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Open Execution Audit
          </a>

        </div>

        <div className="mt-8 space-y-6">
          {(data?.tasks || []).map((item: any) => (
            <AutonomousTaskCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>

      <div className="mt-3 text-4xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}