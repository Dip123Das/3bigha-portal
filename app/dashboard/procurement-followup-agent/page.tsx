// app/dashboard/procurement-followup-agent/page.tsx

"use client";

import { useEffect, useState } from "react";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import ProcurementFollowupAgentCard from "@/components/procurement/ProcurementFollowupAgentCard";

export default function ProcurementFollowupAgentPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/ai/procurement-followup-agent")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const summary = data?.summary || {};

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-blue-950 to-violet-950 p-10 text-white shadow-2xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            Autonomous Procurement Follow-up AI
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-tight">
            AI Procurement Follow-up Agent
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Autonomous workflow follow-up, supplier recovery,
            inactivity escalation and procurement momentum
            recovery orchestration.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold text-slate-100">
            {data?.executiveDirective}
          </div>
        </div>

        <div className="mt-8">
          <ProcurementCommandCenterNav />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Total
            </div>

            <div className="mt-3 text-5xl font-black text-slate-950">
              {summary.total || 0}
            </div>
          </div>

          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-red-600">
              Critical
            </div>

            <div className="mt-3 text-5xl font-black text-red-700">
              {summary.critical || 0}
            </div>
          </div>

          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
              High
            </div>

            <div className="mt-3 text-5xl font-black text-amber-800">
              {summary.high || 0}
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Medium
            </div>

            <div className="mt-3 text-5xl font-black text-blue-800">
              {summary.medium || 0}
            </div>
          </div>
        </div>

                <div className="mt-8 rounded-[2rem] border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="text-sm font-black uppercase tracking-[0.14em] text-blue-700">
            Autonomous Procurement Recovery Routing
          </div>

          <div className="mt-3 text-2xl font-black text-blue-950">
            AI is now generating backup supplier follow-up and emergency recovery workflows.
          </div>

          <div className="mt-4 text-sm font-semibold leading-6 text-blue-900">
            Supplier silence, overload escalation and procurement continuity
            recovery are now integrated into AI follow-up orchestration.
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {(data?.workflows || []).map((workflow: any) => (
            <ProcurementFollowupAgentCard
              key={workflow.id}
              workflow={workflow}
            />
          ))}
        </div>
      </div>
    </main>
  );
}