"use client";

import Link from "next/link";
import { buildAiExecutionPlan } from "@/lib/ai-execution/execution-engine";
import type { AiExecutionInput } from "@/lib/ai-execution/execution-types";

function urgencyClass(urgency: string) {
  if (urgency === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (urgency === "high") return "border-amber-200 bg-amber-50 text-amber-700";
  if (urgency === "medium") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default function AIExecutionDrawer({
  input,
  compact = false,
}: {
  input: AiExecutionInput;
  compact?: boolean;
}) {
  const plan = buildAiExecutionPlan(input);

  if (!plan.show || !plan.actions.length) return null;

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-blue-950 to-violet-900 px-4 py-4 text-white md:px-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blue-100">
              Universal AI Execution Drawer
            </div>

            <div className="mt-2 text-lg font-black tracking-tight md:text-xl">
              {plan.title}
            </div>

            {!compact ? (
              <div className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-white/70">
                {plan.subtitle}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${urgencyClass(plan.urgency)}`}>
              {plan.urgency.toUpperCase()}
            </span>

            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black text-white">
              Score {plan.score}/100
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            Stage: {plan.stage}
          </span>

          {plan.signals.map((signal) => (
            <span
              key={signal}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600"
            >
              {signal}
            </span>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plan.actions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 transition hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-black">
                  {action.icon} {action.title}
                </div>

                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${urgencyClass(action.priority)}`}>
                  {action.priority}
                </span>
              </div>

              <div className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                {action.description}
              </div>

              <div className="mt-3 text-xs font-black text-blue-700">
                Execute →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}