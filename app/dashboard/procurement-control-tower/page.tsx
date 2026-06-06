import Link from "next/link";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import { headers } from "next/headers";
import {
  calculateOperationalAttentionPriority,
  sortByOperationalAttention,
} from "@/lib/procurement/intelligence/operational-priority";

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
    const [towerRes, cognitionRes] = await Promise.all([
      fetch(`${origin}/api/ai/procurement-control-tower`, {
        cache: "no-store",
      }),
      fetch(`${origin}/api/ai/procurement-unified-cognition`, {
        cache: "no-store",
      }),
    ]);

    const tower = await towerRes.json();
    const cognition = await cognitionRes.json();

    return {
      ...tower,
      cognition,
    };
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
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-[11px] font-medium leading-4 text-slate-500">{subtext}</div>
    </div>
  );
}

export default async function ProcurementControlTowerPage() {
  const compactMode = true;
  const data = await loadControlTower();
  const summary = data?.summary || {};
  const insights = data?.insights || {};
  const cognitionData = data?.cognition || {};
  const cognition = cognitionData?.cognition || {};
  const riskMap = Array.isArray(data?.riskMap) ? data.riskMap : [];

  function itemAttention(item: any) {
    const ageHours = Number(item.ageHours || item.workflowAgeHours || 0);
    const risk = String(item.risk || item.priority || "").toLowerCase();

    const urgency =
      risk === "critical"
        ? 20
        : risk === "high"
          ? 14
          : risk === "medium"
            ? 8
            : 4;

    const operationalRisk =
      risk === "critical"
        ? 15
        : risk === "high"
          ? 10
          : risk === "medium"
            ? 5
            : 0;

    return calculateOperationalAttentionPriority({
      decay: {
        workflowAgeHours: ageHours,
        hoursSinceLastActivity: ageHours,
        quoteCount: Number(item.quoteCount || item.quotes || 0),
      },
      momentum: {
        recentActivityCount: ageHours <= 12 ? 3 : 0,
        quoteGrowth: Number(item.quoteCount || item.quotes || 0) > 0 ? 1 : 0,
      },
      urgency,
      operationalRisk,
      workflowHealth:
        risk === "critical"
          ? 25
          : risk === "high"
            ? 45
            : risk === "medium"
              ? 65
              : 85,
      escalationSignals:
        risk === "critical" ? 2 : risk === "high" ? 1 : 0,
    });
  }

  const prioritizedRiskMap = sortByOperationalAttention(
    riskMap,
    itemAttention
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5">
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-5 md:p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-100">
          AI Procurement Operations Desk
        </div>

        <h1 className="mt-3 text-2xl md:text-3xl font-black tracking-tight">
          Executive Procurement Intelligence Dashboard
        </h1>

        <p className="mt-3 max-w-3xl text-xs md:text-sm font-medium leading-5 text-slate-200">
          Live AI overview of active procurement conversations, SLA risk,
          stale RFQs, follow-up urgency, closure health and execution priorities.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/inbox-v2"
            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950"
          >
            Open Inbox Work Desk
          </Link>

          <Link
            href="/rfq/general/new"
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-black text-white"
          >
            + New Procurement RFQ
          </Link>
        </div>
      </div>

      <ProcurementCommandCenterNav />


      <div className={`rounded-[1.75rem] border p-5 shadow-sm ${
        cognition.predictiveRisk === "critical"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : cognition.predictiveRisk === "high"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : cognition.predictiveRisk === "elevated"
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em]">
              Predictive Cognition
            </div>

            <div className="mt-2 text-2xl font-black">
              {cognition.trajectory || "stable"} · {cognition.predictiveRisk || "low"}
            </div>

            <div className="mt-2 max-w-3xl text-sm font-bold leading-6">
              {cognitionData?.executiveSummary || "Procurement cognition stable."}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-white/40 bg-white/50 px-4 py-2 text-xs font-black">
              Cognition {cognition.cognitionScore || 0}
            </div>

            <div className="rounded-2xl border border-white/40 bg-white/50 px-4 py-2 text-xs font-black">
              Drift {cognition.operationalDrift || 0}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/30 bg-white/40 px-4 py-3 text-sm font-bold">
          {cognitionData?.nextBestAction || "Continue executive procurement monitoring."}
        </div>
      </div>

      {!data?.ok ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          Procurement Operations Desk could not load.
        </div>
      ) : null}

      <div className={`grid gap-3 ${compactMode ? "grid-cols-2 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-5"}`}>
        <StatCard label="Total Threads" value={summary.total ?? 0} subtext="Loaded procurement conversations" />
        <StatCard label="Active" value={summary.active ?? 0} subtext="Open procurement workflows" />
        <StatCard label="Closed" value={summary.closed ?? 0} subtext="Closed conversations" />
        <StatCard label="Closure Rate" value={`${summary.closureRate ?? 0}%`} subtext="Conversation closure health" />
        <StatCard label="Avg Age" value={`${summary.avgAge ?? 0}h`} subtext="Average active thread age" />
      </div>

      <div className={`grid gap-3 ${compactMode ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-4"}`}>
        <StatCard label="Critical Risk" value={summary.critical ?? 0} subtext="Immediate escalation" />
        <StatCard label="High Risk" value={summary.high ?? 0} subtext="Follow-up today" />
        <StatCard label="Medium Risk" value={summary.medium ?? 0} subtext="Monitor and nudge" />
        <StatCard label="Stable" value={summary.low ?? 0} subtext="Healthy active threads" />
      </div>

      <div className={`grid gap-3 ${compactMode ? "md:grid-cols-3" : "grid-cols-1 lg:grid-cols-3"}`}>
        <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-black text-blue-800">Executive Summary</div>
          <div className="mt-2 text-xs font-semibold leading-5 text-blue-950">
            {insights.executiveSummary || "No executive insight available."}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-black text-emerald-800">Next Best Action</div>
          <div className="mt-2 text-xs font-semibold leading-5 text-emerald-950">
            {insights.nextBestAction || "Monitor active procurement workflows."}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4">
          <div className="text-sm font-black text-violet-800">Pipeline Forecast</div>
          <div className="mt-2 text-xs font-semibold leading-5 text-violet-950">
            {insights.forecast || "Pipeline forecast unavailable."}
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-base font-black text-slate-950">
            Procurement Risk Map
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Highest-risk active procurement conversations ranked by adaptive operational attention.
          </p>
        </div>

        {riskMap.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No active procurement risk items found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {prioritizedRiskMap.map((item: any) => (
              <Link
                key={item.id}
                href={item.href}
                className="block p-4 transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs md:text-sm font-black text-slate-950">
                      {item.title}
                    </div>
                    <div className="mt-1 text-[11px] font-medium leading-4 text-slate-500">
                      {item.module} • Last active {item.ageHours}h ago
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${riskClass(
                        item.risk
                      )}`}
                    >
                      {item.risk} · attention {itemAttention(item).attentionScore}
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