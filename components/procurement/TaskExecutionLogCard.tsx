"use client";

type Props = {
  item: {
    task: string;
    action: string;
    status: string;
    priority: string;
    time: string;
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

      <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
        {new Date(item.time).toLocaleString()}
      </div>
    </div>
  );
}