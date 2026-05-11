import Link from "next/link";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import { headers } from "next/headers";

async function getOrigin() {
  const h = await headers();

  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";

  return host.startsWith("http")
    ? host
    : `${proto}://${host}`;
}

const MODULES = [
  ["🚨", "Situation Room", "/dashboard/procurement-situation-room", "Live command center"],
  ["⚡", "Live Stream", "/dashboard/procurement-live", "Real-time procurement signals"],
  ["🔥", "Heatmap AI", "/dashboard/procurement-heatmap", "Category, zone and risk heatmap"],
  ["📈", "Shortage Forecast", "/dashboard/procurement-analytics", "Shortage and supplier stress forecast"],
  ["🛰️", "Mission Control", "/dashboard/procurement-mission-control", "Executive command center"],
  ["🏛️", "War Room", "/dashboard/procurement-war-room", "Emergency operations HQ"],
  ["🛡️", "Crisis Center", "/dashboard/procurement-crisis-center", "Crisis escalation engine"],
  ["🏭", "Supplier AI", "/dashboard/procurement-supplier-reliability", "Supplier reliability and collapse prediction"],
  ["📥", "Inbox AI", "/dashboard/procurement-inbox-actions", "Emergency rerouting and inbox actions"],
  ["🤖", "Follow-up AI", "/dashboard/procurement-followup-agent", "Recovery follow-up automation"],
  ["🤝", "Negotiation AI", "/dashboard/procurement-negotiation-agent", "Fallback negotiation intelligence"],
  ["🧩", "AI Actions", "/dashboard/procurement-actions", "Autonomous decision layer"],
  ["🛠️", "Auto Tasks", "/dashboard/procurement-autonomous-tasks", "Autonomous task queue"],
  ["🚀", "Real Execute", "/dashboard/procurement-real-execution", "Execution readiness bridge"],
  ["📜", "Task Log", "/dashboard/procurement-task-execution-log", "Execution history log"],
  ["🧠", "AI Copilot", "/dashboard/procurement-copilot", "Ask procurement intelligence"],
];

export default async function ProcurementOSPage() {
  let telemetry: any = null;

  try {
    const origin = await getOrigin();

    const res = await fetch(
      `${origin}/api/ai/procurement-telemetry`,
      {
        cache: "no-store",
      }
    );

    telemetry = await res.json();
  } catch {
    telemetry = { ok: false };
  }

  const t = telemetry?.telemetry || {};
  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-indigo-950 to-emerald-950 p-10 text-white shadow-2xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            3bigha AI Procurement OS
          </div>

          <h1 className="mt-6 text-5xl font-black">
            Master Procurement Command Index
          </h1>

          <p className="mt-4 max-w-4xl text-base font-medium leading-7 text-slate-200">
            One clean operating index for all AI procurement intelligence, crisis,
            recovery, rerouting, forecasting, execution and autonomous decision systems.
          </p>
        </div>

        <div className="mt-8">
          <ProcurementCommandCenterNav />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <TelemetryCard
            label="Active Threads"
            value={t.activeConversations || 0}
          />

          <TelemetryCard
            label="Stale Threads"
            value={t.staleConversations || 0}
          />

          <TelemetryCard
            label="Critical Threads"
            value={t.criticalConversations || 0}
          />

          <TelemetryCard
            label="24h Messages"
            value={t.messages24h || 0}
          />

          <TelemetryCard
            label="Operational Load"
            value={t.operationalLoad || 0}
          />

          <TelemetryCard
            label="Recovery Pressure"
            value={t.recoveryPressure || 0}
          />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {MODULES.map(([emoji, title, href, text]) => (
            <Link
              key={href}
              href={href}
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="text-4xl">{emoji}</div>

              <div className="mt-4 text-xl font-black text-slate-950">
                {title}
              </div>

              <div className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {text}
              </div>

              <div className="mt-5 inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                Open →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
function TelemetryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}