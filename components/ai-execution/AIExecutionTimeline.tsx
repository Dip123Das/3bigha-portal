"use client";

import { buildAiExecutionTimeline } from "@/lib/ai-execution/execution-timeline";

function statusClass(status: string) {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "active") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "risk") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

export default function AIExecutionTimeline({
  input,
}: {
  input: Parameters<typeof buildAiExecutionTimeline>[0];
}) {
  const stages = buildAiExecutionTimeline(input);

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
        AI Execution Timeline
      </div>

      <div className="mt-1 text-lg font-black text-slate-950">
        Deal Operating System
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-7">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`rounded-2xl border p-3 ${statusClass(stage.status)}`}
          >
            <div className="text-lg">{stage.icon}</div>
            <div className="mt-1 text-xs font-black">{stage.label}</div>
            <div className="mt-1 text-[11px] font-semibold leading-4 opacity-80">
              {stage.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}