// components/procurement/ProcurementFollowupAgentCard.tsx

"use client";

type Props = {
  workflow: {
    title: string;
    module: string;
    inactivityHours: number;
    urgency: string;
    nextAction: string;
    autoAction: string;
    recoveryScore: number;
  };
};

export default function ProcurementFollowupAgentCard({
  workflow,
}: Props) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-lg font-black text-slate-950">
            {workflow.title}
          </div>

          <div className="mt-1 text-sm font-semibold text-slate-500">
            {workflow.module}
          </div>
        </div>

        <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
          {workflow.urgency}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Inactivity
          </div>

          <div className="mt-2 text-3xl font-black text-slate-950">
            {workflow.inactivityHours}h
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
            Next Action
          </div>

          <div className="mt-2 text-sm font-bold text-emerald-950">
            {workflow.nextAction}
          </div>
        </div>

        <div className="rounded-2xl bg-violet-50 p-4">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
            AI Automation
          </div>

          <div className="mt-2 text-sm font-bold text-violet-950">
            {workflow.autoAction}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
          <span>Recovery Probability</span>
          <span>{workflow.recoveryScore}%</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-950"
            style={{
              width: `${workflow.recoveryScore}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}