"use client";

import { useEffect, useState } from "react";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import AutonomousTaskCard from "@/components/procurement/AutonomousTaskCard";

export default function ProcurementAutonomousTasksPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/ai/procurement-autonomous-tasks")
      .then((r) => r.json())
      .then(setData);
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

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="Total Tasks" value={summary.total || 0} />
          <Stat label="Critical" value={summary.critical || 0} />
          <Stat label="High" value={summary.high || 0} />
          <Stat label="Ready" value={summary.ready || 0} />
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