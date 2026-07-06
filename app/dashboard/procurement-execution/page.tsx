import { headers } from "next/headers";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOrigin() {
  const h = await headers();

  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";

  return host.startsWith("http")
    ? host
    : `${proto}://${host}`;
}

async function loadExecution() {
  try {
    const origin = await getOrigin();

    const res = await fetch(
      `${origin}/api/ai/procurement-execution-engine`,
      {
        cache: "no-store",
      }
    );

    return await res.json();
  } catch {
    return { ok: false };
  }
}

function modeClass(mode?: string) {
  if (mode === "critical-intervention") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (mode === "recovery") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (mode === "stable") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default async function ProcurementExecutionPage() {
  const data = await loadExecution();

  const plan = Array.isArray(
    data?.autonomousExecution?.executionPlan
  )
    ? data.autonomousExecution.executionPlan
    : [];

  return (
    <div className="w-full space-y-6 px-4 py-6">
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-950 via-violet-950 to-indigo-950 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
          Autonomous Procurement Execution Workspace
        </div>

        <h1 className="mt-4 text-3xl font-black">
          AI Procurement Execution Workflow
        </h1>

        <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-slate-200">
          Autonomous AI-guided procurement execution planning,
          workflow recovery, escalation orchestration and
          operational procurement momentum management.
        </p>
      </div>

      <ProcurementCommandCenterNav />

      {!data?.ok ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          Procurement execution intelligence unavailable.
        </div>
      ) : null}

      <div
        className={`rounded-[2rem] border p-6 shadow-sm ${modeClass(
          data?.executionMode
        )}`}
      >
        <div className="text-xs font-black uppercase tracking-[0.14em]">
          Execution Mode
        </div>

        <div className="mt-3 text-4xl font-black">
          {data?.executionMode || "unknown"}
        </div>

        <div className="mt-3 text-sm font-semibold leading-6">
          {data?.aiReasoning ||
            "Execution reasoning unavailable."}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[2rem] border border-blue-200 bg-blue-50 p-5">
          <div className="text-sm font-black text-blue-800">
            Immediate Action
          </div>

          <div className="mt-2 text-sm font-semibold leading-6 text-blue-950">
            {data?.autonomousExecution?.immediateAction ||
              "Review active procurement workflows."}
          </div>
        </div>

        <div className="rounded-[2rem] border border-violet-200 bg-violet-50 p-5">
          <div className="text-sm font-black text-violet-800">
            Execution Priority
          </div>

          <div className="mt-2 text-2xl font-black text-violet-950">
            {data?.executionPriority || "normal"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href="/dashboard/procurement-mission-control"
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Open Work Desk
        </a>

        <a
          href="/dashboard/procurement-actions"
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          Open Pending Actions
        </a>

        <a
          href="/dashboard/procurement-followup-agent"
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          Open Follow-up AI
        </a>

        <a
          href="/dashboard/procurement-situation-room"
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          Open Work Updates
        </a>
      </div>

      <div className="proc-shell-lg">
        <div className="text-lg font-black text-slate-950">
          Workflow Execution Plan
        </div>

        <div className="mt-4 space-y-3">
          {plan.map((step: string, idx: number) => (
            <div
              key={`${step}-${idx}`}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                {idx + 1}
              </div>

              <div className="text-sm font-semibold leading-6 text-slate-800">
                {step}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}