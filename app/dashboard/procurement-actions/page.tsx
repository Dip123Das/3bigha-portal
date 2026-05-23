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

async function loadActions() {
  try {
    const origin = await getOrigin();

    const res = await fetch(
      `${origin}/api/ai/procurement-execution-actions`,
      {
        cache: "no-store",
      }
    );

    return await res.json();
  } catch {
    return { ok: false };
  }
}

function priorityClass(level?: string) {
  if (level === "critical") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (level === "high") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default async function ProcurementActionsPage() {
  const data = await loadActions();

  const actions = Array.isArray(data?.actions)
    ? data.actions
    : [];

  let decisionData: any = null;

  try {
    const origin = await getOrigin();

    const decisionRes = await fetch(
      `${origin}/api/ai/procurement-autonomous-decisions`,
      {
        cache: "no-store",
      }
    );

    decisionData = await decisionRes.json();
  } catch {
    decisionData = { ok: false };
  }

  const decisions = Array.isArray(
    decisionData?.decisions
  )
    ? decisionData.decisions
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-950 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
          Autonomous Procurement Actions
        </div>

        <h1 className="mt-4 text-3xl font-black">
          AI Procurement Action Center
        </h1>

        <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-slate-200">
          AI-generated procurement execution actions,
          operational directives and workflow recovery intelligence.
        </p>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-bold text-indigo-50">
          {data?.executiveDirective ||
            "No executive directive available."}
        </div>
      </div>

      <ProcurementCommandCenterNav />

      {!data?.ok ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          Procurement action engine unavailable.
        </div>
      ) : null}

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              AI Autonomous Decision Layer
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Autonomous procurement decision intelligence and executive action orchestration.
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-black text-indigo-700">
            Decisions: {decisions.length}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {decisions.map((item: any) => (
            <div
              key={item.title}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                    item.urgency === "Critical"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : item.urgency === "High"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-blue-200 bg-blue-50 text-blue-700"
                  }`}
                >
                  {item.urgency}
                </span>

                <span className="inline-flex rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-black text-white">
                  {item.decision}
                </span>
              </div>

              <div className="mt-4 text-2xl font-black text-slate-950">
                {item.title}
              </div>

              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                  AI Explanation
                </div>

                <div className="mt-2 text-sm font-semibold leading-6 text-blue-950">
                  {item.explanation}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm font-black text-slate-700">
                  <span>Decision Confidence</span>
                  <span>{item.confidence}%</span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      item.confidence >= 85
                        ? "bg-emerald-500"
                        : item.confidence >= 70
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                    style={{
                      width: `${item.confidence}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-800">
                🤖 {item.aiAction}
              </div>
            </div>
          ))}
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
          href="/dashboard/procurement-execution"
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          Open Execution Workspace
        </a>

        <a
          href="/dashboard/procurement-crisis-center"
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          Open Issue Center
        </a>
      </div>

      <div className="space-y-4">
        {actions.map((item: any, idx: number) => (
          <div
            key={`${item.action}-${idx}`}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${priorityClass(
                  item.priority
                )}`}
              >
                {item.priority}
              </span>

              <span className="inline-flex rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-black text-white">
                Autonomous Action
              </span>
            </div>

            <div className="mt-4 text-xl font-black text-slate-950">
              {item.action}
            </div>

            <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-sm font-black text-blue-800">
                Automation
              </div>

              <div className="mt-2 text-sm font-semibold leading-6 text-blue-950">
                {item.automation}
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <div className="text-sm font-black text-violet-800">
                Expected Impact
              </div>

              <div className="mt-2 text-sm font-semibold leading-6 text-violet-950">
                {item.impact}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}