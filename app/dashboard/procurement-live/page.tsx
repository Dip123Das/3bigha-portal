import Link from "next/link";
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

async function loadLiveEvents() {
  try {
    const origin = await getOrigin();
    const res = await fetch(`${origin}/api/ai/procurement-live-events`, {
      cache: "no-store",
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

function toneClass(tone?: string) {
  if (tone === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (tone === "high") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tone === "medium") return "border-blue-200 bg-blue-50 text-blue-700";
  if (tone === "closed") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
    </div>
  );
}

export default async function ProcurementLivePage() {
  const data = await loadLiveEvents();
  const summary = data?.summary || {};
  const events = Array.isArray(data?.events) ? data.events : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-950 via-cyan-950 to-blue-950 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
          Real-Time Procurement Operations
        </div>

        <h1 className="mt-4 text-3xl font-black">
          Live AI Procurement Event Stream
        </h1>

        <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-slate-200">
          Live procurement signals, SLA-risk events, inactivity alerts, workflow
          nudges, and execution priorities across active conversations.
        </p>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-bold text-cyan-50">
          {data?.executiveSignal || "Live event intelligence unavailable."}
        </div>
      </div>

      <ProcurementCommandCenterNav />

      {!data?.ok ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          Live procurement events could not load.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        <StatCard label="Total Events" value={summary.total ?? 0} />
        <StatCard label="Active" value={summary.active ?? 0} />
        <StatCard label="Nudges" value={summary.medium ?? 0} />
        <StatCard label="High" value={summary.high ?? 0} />
        <StatCard label="Critical" value={summary.critical ?? 0} />
        <StatCard label="Closed" value={summary.closed ?? 0} />
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">
            Live Procurement Signals
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest operational signals ranked from recent activity to stale risk.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No live procurement events found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.map((event: any) => (
              <Link
                key={event.id}
                href={event.href}
                className="block p-5 transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-950">
                      {event.title}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {event.module} • {event.ageHours}h since last activity
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-700">
                      {event.signal}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${toneClass(
                        event.tone
                      )}`}
                    >
                      {event.tone}
                    </span>

                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                      {event.action}
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