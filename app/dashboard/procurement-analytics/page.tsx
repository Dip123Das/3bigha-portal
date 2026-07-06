import Link from "next/link";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import { headers } from "next/headers";
import ProcurementHeatmapIntelligence from "@/app/components/procurement/ProcurementHeatmapIntelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOrigin() {
  const h = await headers();
  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";

  return host.startsWith("http") ? host : `${proto}://${host}`;
}

async function loadForecast() {
  try {
    const origin = await getOrigin();

    const res = await fetch(`${origin}/api/ai/procurement-forecast`, {
      cache: "no-store",
    });

    return await res.json();
  } catch {
    return { ok: false };
  }
}

function riskClass(level?: string) {
  if (level === "Critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (level === "High") return "border-amber-200 bg-amber-50 text-amber-700";
  if (level === "Medium") return "border-blue-200 bg-blue-50 text-blue-700";

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="proc-shell-lg">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}

export default async function ProcurementAnalyticsPage() {
  const data = await loadForecast();

  const summary = data?.summary || {};
  const forecast = data?.forecast || {};
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  let shortageData: any = null;

  try {
    const origin = await getOrigin();

    const shortageRes = await fetch(
      `${origin}/api/ai/procurement-shortage-forecast`,
      {
        cache: "no-store",
      }
    );

    shortageData = await shortageRes.json();
  } catch {
    shortageData = { ok: false };
  }

  const shortageRows = Array.isArray(shortageData?.rows)
    ? shortageData.rows
    : [];

  return (
    <div className="w-full space-y-6 px-4 py-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-100">
          AI Procurement Forecasting
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight">
          Predictive Procurement Analytics Dashboard
        </h1>

        <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-slate-200">
          AI-driven procurement forecasting, closure probability prediction,
          supplier reliability intelligence and pipeline health analytics.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard/procurement-control-tower"
            className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950"
          >
            Open Operations Desk
          </Link>

          <Link
            href="/dashboard/inbox-v2"
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white"
          >
            Open Procurement Inbox
          </Link>
        </div>
      </div>

      <ProcurementCommandCenterNav />

      {!data?.ok ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          Procurement analytics could not load.
        </div>
      ) : null}

      <ProcurementHeatmapIntelligence
        liveEvents={rows}
        timelineSteps={shortageRows}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total Threads" value={summary.totalThreads ?? 0} />
        <StatCard
          label="Avg Closure Probability"
          value={`${summary.avgProbability ?? 0}%`}
        />
        <StatCard label="Likely Closures" value={summary.likelyClosures ?? 0} />
        <StatCard label="High Risk Threads" value={summary.highRisk ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
          <div className="text-sm font-black text-blue-800">
            Executive Insight
          </div>

          <div className="mt-2 text-sm font-semibold leading-6 text-blue-950">
            {forecast.executiveInsight || "No forecast insight available."}
          </div>
        </div>

        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
          <div className="text-sm font-black text-violet-800">
            Next Week Forecast
          </div>

          <div className="mt-2 text-sm font-semibold leading-6 text-violet-950">
            {forecast.nextWeekForecast || "No next-week forecast available."}
          </div>
        </div>
      </div>

            <div className="proc-shell-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              AI Procurement Shortage Forecast
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Predictive shortage, supplier exhaustion and negotiation inflation intelligence.
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700">
            Critical: {shortageData?.summary?.critical || 0}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {shortageRows.map((item: any) => (
            <div
              key={item.id}
              className="proc-shell-muted"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                  {item.risk}
                </span>

                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {item.affectedZone}
                </span>
              </div>

              <div className="mt-4 text-xl font-black text-slate-950">
                {item.category}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <Metric
                  label="Shortage"
                  value={item.shortageRisk}
                />

                <Metric
                  label="Supplier Stress"
                  value={item.supplierStress}
                />

                <Metric
                  label="Negotiation"
                  value={item.negotiationInflation}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                {item.recommendation}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">
            Procurement Forecast Pipeline
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            AI-ranked procurement conversations with closure prediction and
            supplier reliability.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No procurement forecast items found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((item: any) => (
              <Link
                key={item.id}
                href={item.href}
                className="block p-5 transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-950">
                      {item.title}
                    </div>

                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {item.module} • {item.ageHours}h old
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      {item.closureProbability}% closure chance
                    </span>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${riskClass(
                        item.risk
                      )}`}
                    >
                      {item.risk}
                    </span>

                    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      {item.supplierReliability}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-sm font-semibold text-slate-700">
                  {item.projectedStatus}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}