"use client";

type Props = {
  item: {
    task: string;
    action: string;
    status: string;
    priority: string;
    time: string;
    mode?: string;
    confidence?: number;
  };
};

export default function TaskExecutionLogCard({ item }: Props) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-slate-950">
            {item.task}
          </div>

          <div className="mt-2 text-sm font-semibold text-slate-500">
            {item.action}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
            {item.priority}
          </span>

          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700">
            {item.status}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Time
          </div>

          <div className="mt-2 text-sm font-black text-slate-950">
            {new Date(item.time).toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Mode
          </div>

          <div className="mt-2 text-sm font-black text-slate-950">
            {item.mode || "preview"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Confidence
          </div>

          <div className="mt-2 text-sm font-black text-slate-950">
            {item.confidence || 0}%
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800">
        AI procurement execution audit trail active.
      </div>
    </div>
  );
}