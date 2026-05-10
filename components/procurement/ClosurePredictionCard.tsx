"use client";

type Props = {
  item: {
    workflow: string;
    probability: number;
    stage: string;
    blocker: string;
    aiDirective: string;
  };
};

export default function ClosurePredictionCard({ item }: Props) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-slate-950">
            {item.workflow}
          </div>

          <div className="mt-2 text-sm font-semibold text-slate-500">
            Stage: {item.stage}
          </div>
        </div>

        <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
          {item.probability}%
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-amber-50 p-5">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
          Closure Blocker
        </div>

        <div className="mt-3 text-lg font-black text-amber-950">
          {item.blocker}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-violet-50 p-5">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
          AI Directive
        </div>

        <div className="mt-3 text-lg font-black text-violet-950">
          {item.aiDirective}
        </div>
      </div>
    </div>
  );
}