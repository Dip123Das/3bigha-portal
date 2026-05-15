"use client";

import type { AutonomousConstructionSupervisorPlan } from "@/lib/construction-cost/autonomous-supervisor-engine";

type Props = {
  plan: AutonomousConstructionSupervisorPlan | null;
  loading?: boolean;
};

export default function ConstructionSupervisorConsole({ plan, loading = false }: Props) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-black text-slate-950">AI Construction Supervisor</div>
        <p className="mt-2 text-sm text-slate-500">Preparing supervisor console...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-black text-slate-950">AI Construction Supervisor</div>
        <p className="mt-2 text-sm text-slate-500">No supervisor plan available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Autonomous Construction Supervisor
          </div>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            Site Supervision Console
          </h3>
        </div>

        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase text-white">
          {plan.mode.replaceAll("_", " ")}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black">{plan.alerts.length}</div>
          <div className="text-xs font-bold uppercase text-slate-500">Alerts</div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black">{plan.commands.length}</div>
          <div className="text-xs font-bold uppercase text-slate-500">Commands</div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-sm font-black capitalize">
            {plan.siteIntelligence.siteSupervisionNeed}
          </div>
          <div className="text-xs font-bold uppercase text-slate-500">Supervision</div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-sm font-black">
            {plan.futureAutonomousExecutionReady ? "Ready" : "Review"}
          </div>
          <div className="text-xs font-bold uppercase text-slate-500">Automation</div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="text-sm font-black text-blue-950">Owner message draft</div>
        <p className="mt-1 text-sm leading-6 text-blue-900">{plan.ownerMessageDraft}</p>
      </div>

      <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50 p-4">
        <div className="text-sm font-black text-violet-950">Contractor message draft</div>
        <p className="mt-1 text-sm leading-6 text-violet-900">{plan.contractorMessageDraft}</p>
      </div>

      <div className="mt-5">
        <div className="text-sm font-black text-slate-900">Supervisor commands</div>
        <div className="mt-3 space-y-3">
          {plan.commands.map((command, index) => (
            <div key={`${command.type}-${index}`} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-black text-slate-950">{command.title}</div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black uppercase text-slate-600">
                  {command.priority}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{command.instruction}</p>
              <div className="mt-2 text-xs font-bold text-slate-500">
                {command.automationReady ? "Future autonomous execution ready" : "Manual supervision required"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-sm font-black text-slate-900">Daily site checklist</div>
        <div className="mt-3 space-y-2">
          {plan.siteIntelligence.dailyChecklist.map((item) => (
            <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
