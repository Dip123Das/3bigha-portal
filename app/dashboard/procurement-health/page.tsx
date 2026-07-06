import { headers } from "next/headers";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOrigin() {
  const h = await headers();
  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  return host.startsWith("http") ? host : `${proto}://${host}`;
}

async function loadHealth() {
  try {
    const origin = await getOrigin();
    const res = await fetch(`${origin}/api/ai/procurement-health-score`, {
      cache: "no-store",
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

function scoreClass(score: number) {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 65) return "text-blue-700 bg-blue-50 border-blue-200";
  if (score >= 45) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-rose-700 bg-rose-50 border-rose-200";
}

export default async function ProcurementHealthPage() {
  const data = await loadHealth();
  const summary = data?.summary || {};
  const score = Number(data?.healthScore || 0);
  const weakPoints = Array.isArray(data?.weakPoints) ? data.weakPoints : [];

  return (
    <div className="w-full space-y-6 px-4 py-6">
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-950 via-emerald-950 to-blue-950 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
          Procurement Health
        </div>

        <h1 className="mt-4 text-3xl font-black">
          Procurement Work Status
        </h1>

        <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-slate-200">
          Unified executive score combining control tower, forecast, live stream
          and anomaly signals.
        </p>
      </div>

      <ProcurementCommandCenterNav />

      <div className={`rounded-[2rem] border p-6 shadow-sm ${scoreClass(score)}`}>
        <div className="text-sm font-black uppercase tracking-[0.14em]">
          Overall Health Score
        </div>

        <div className="mt-3 text-6xl font-black">{score}/100</div>

        <div className="mt-2 text-2xl font-black">
          {data?.healthStatus || "Unknown"}
        </div>

        <p className="mt-4 max-w-4xl text-sm font-semibold leading-6">
          {data?.executiveDiagnosis || "Health diagnosis unavailable."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Stat label="Total" value={summary.total ?? 0} />
        <Stat label="Active" value={summary.active ?? 0} />
        <Stat label="Closed" value={summary.closed ?? 0} />
        <Stat label="Critical Threads" value={summary.criticalThreads ?? summary.critical ?? 0} />
        <Stat label="Critical Signals" value={summary.criticalSignals ?? 0} />
      </div>

      <div className="rounded-[2rem] border border-blue-200 bg-blue-50 p-5">
        <div className="text-sm font-black text-blue-800">Immediate Action</div>
        <div className="mt-2 text-sm font-semibold leading-6 text-blue-950">
          {data?.immediateAction || "Open procurement inbox and review active workflows."}
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
          href="/dashboard/procurement-war-room"
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          Open Priority Work
        </a>

        <a
          href="/dashboard/procurement-crisis-center"
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          Open Issue Center
        </a>

        <a
          href="/dashboard/procurement-analytics"
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          Open Shortage Forecast
        </a>

      </div>

      <div className="proc-shell-lg">
        <div className="text-lg font-black text-slate-950">Weak Points</div>

        {weakPoints.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            No major weak points detected.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {weakPoints.map((item: string) => (
              <div
                key={item}
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800"
              >
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="proc-shell-lg">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
    </div>
  );
}