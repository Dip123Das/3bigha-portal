"use client";

import type { ConstructionRecoveryPlan } from "@/lib/construction-cost/recovery-types";

type Props = {
  plan: ConstructionRecoveryPlan | null;
  loading?: boolean;
};

const severityClass: Record<string, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-900",
  medium: "border-amber-200 bg-amber-50 text-amber-900",
  high: "border-orange-200 bg-orange-50 text-orange-900",
  critical: "border-red-200 bg-red-50 text-red-900",
};

export default function ConstructionRecoveryPanel({ plan, loading = false }: Props) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-black text-slate-900">AI Recovery Engine</div>
        <div className="mt-2 text-sm text-slate-500">Checking delay and procurement risk...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-black text-slate-900">AI Recovery Engine</div>
        <div className="mt-2 text-sm text-slate-500">
          No recovery data available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            AI Delay Recovery
          </div>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            Procurement Escalation Engine
          </h3>
        </div>

        <div
          className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
            severityClass[plan.overallSeverity] || severityClass.low
          }`}
        >
          {plan.overallSeverity} risk
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="text-sm font-black text-slate-900">Buyer warning</div>
        <p className="mt-1 text-sm leading-6 text-slate-700">{plan.buyerWarning}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black text-slate-950">
            {plan.delayedMilestones.length}
          </div>
          <div className="text-xs font-bold uppercase text-slate-500">Delayed</div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black text-slate-950">
            {plan.blockedMilestones.length}
          </div>
          <div className="text-xs font-bold uppercase text-slate-500">Blocked</div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black text-slate-950">
            {plan.actions.filter((action) => action.automationReady).length}
          </div>
          <div className="text-xs font-bold uppercase text-slate-500">
            Automation-ready
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-sm font-black text-slate-900">Recommended actions</div>
        <div className="mt-3 space-y-3">
          {plan.actions.map((action, index) => (
            <div key={`${action.type}-${index}`} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-black text-slate-950">{action.title}</div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-600">
                  {action.priority}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{action.description}</p>
              <div className="mt-2 text-xs font-bold text-slate-500">
                Owner: {action.recommendedOwner} ·{" "}
                {action.automationReady ? "Future autonomous recovery ready" : "Manual review needed"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="text-sm font-black text-blue-950">Procurement escalation</div>
          <p className="mt-1 text-sm leading-6 text-blue-900">{plan.procurementEscalation}</p>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <div className="text-sm font-black text-violet-950">Alternate vendor action</div>
          <p className="mt-1 text-sm leading-6 text-violet-900">
            {plan.alternateVendorSuggestion}
          </p>
        </div>
      </div>
    </div>
  );
}
