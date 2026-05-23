import Link from "next/link";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOrigin() {
  const h = await headers();
  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  return host.startsWith("http") ? host : `${proto}://${host}`;
}

async function loadControlTower() {
  try {
    const origin = await getOrigin();
    const res = await fetch(`${origin}/api/ai/procurement-control-tower`, {
      cache: "no-store",
    });

    return await res.json();
  } catch {
    return { ok: false };
  }
}

function riskClass(risk?: string) {
  if (risk === "Critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (risk === "High") return "border-amber-200 bg-amber-50 text-amber-700";
  if (risk === "Medium") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: number | string;
  subtext: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-500">{subtext}</div>
    </div>
  );
}

export default async function ProcurementControlTowerPage() {
  const data = await loadControlTower();
  const summary = data?.summary || {};
  const insights = data?.insights || {};
  const riskMap = Array.isArray(data?.riskMap) ? data.riskMap : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-100">
          AI Procurement Operations Desk
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight">
          Executive Procurement Intelligence Dashboard
        </h1>

        <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-slate-200">
          Live AI overview of active procurement conversations, SLA risk,
          stale RFQs, follow-up urgency, closure health and execution priorities.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard/inbox-v2"
            className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950"
          >
            Open Inbox Work Desk
          </Link>

          <Link
            href="/rfq/general/new"
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white"
          >
            + New Procurement RFQ
          </Link>
        </div>
      </div>

      <ProcurementCommandCenterNav />

      {!data?.ok ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          Procurement Operations Desk could not load.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Threads" value={summary.total ?? 0} subtext="Loaded procurement conversations" />
        <StatCard label="Active" value={summary.active ?? 0} subtext="Open procurement workflows" />
        <StatCard label="Closed" value={summary.closed ?? 0} subtext="Closed conversations" />
        <StatCard label="Closure Rate" value={`${summary.closureRate ?? 0}%`} subtext="Conversation closure health" />
        <StatCard label="Avg Age" value={`${summary.avgAge ?? 0}h`} subtext="Average active thread age" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Critical Risk" value={summary.critical ?? 0} subtext="Immediate escalation" />
        <StatCard label="High Risk" value={summary.high ?? 0} subtext="Follow-up today" />
        <StatCard label="Medium Risk" value={summary.medium ?? 0} subtext="Monitor and nudge" />
        <StatCard label="Stable" value={summary.low ?? 0} subtext="Healthy active threads" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
          <div className="text-sm font-black text-blue-800">Executive Summary</div>
          <div className="mt-2 text-sm font-semibold leading-6 text-blue-950">
            {insights.executiveSummary || "No executive insight available."}
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="text-sm font-black text-emerald-800">Next Best Action</div>
          <div className="mt-2 text-sm font-semibold leading-6 text-emerald-950">
            {insights.nextBestAction || "Monitor active procurement workflows."}
          </div>
        </div>

        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
          <div className="text-sm font-black text-violet-800">Pipeline Forecast</div>
          <div className="mt-2 text-sm font-semibold leading-6 text-violet-950">
            {insights.forecast || "Pipeline forecast unavailable."}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">
            Procurement Risk Map
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Highest-risk active procurement conversations ranked by SLA age and urgency.
          </p>
        </div>

        {riskMap.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No active procurement risk items found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {riskMap.map((item: any) => (
              <Link
                key={item.id}
                href={item.href}
                className="block p-5 transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-950">
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {item.module} • Last active {item.ageHours}h ago
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${riskClass(
                        item.risk
                      )}`}
                    >
                      {item.risk}
                    </span>

                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                      {item.action}
                    </span>

                    <span className="inline-flex rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                      Open →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}