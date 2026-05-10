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

async function loadMission() {
  try {
    const origin = await getOrigin();
    const res = await fetch(`${origin}/api/ai/procurement-mission-control`, {
      cache: "no-store",
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

function statusClass(level?: string) {
  if (level === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (level === "high-risk") return "border-amber-200 bg-amber-50 text-amber-700";
  if (level === "elevated") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default async function ProcurementMissionControlPage() {
  const data = await loadMission();
  const mission = data?.mission || {};
  const priorities = Array.isArray(data?.topPriorities) ? data.topPriorities : [];
  const directives = Array.isArray(data?.emergencyDirectives)
    ? data.emergencyDirectives
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-rose-950 p-7 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
          Enterprise Procurement Mission Control
        </div>

        <h1 className="mt-4 text-4xl font-black">
          AI Procurement Mission Control
        </h1>

        <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-slate-200">
          Unified executive command layer for procurement health, crisis level,
          execution urgency, live operations and autonomous AI directives.
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-bold text-slate-100">
          {data?.executiveSummary || "Mission intelligence unavailable."}
        </div>
      </div>

      <ProcurementCommandCenterNav />

      {!data?.ok ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          Procurement mission control could not load.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <Stat label="Health" value={`${mission.healthScore ?? 0}/100`} />
        <Stat label="Crisis" value={mission.crisisLevel || "unknown"} />
        <Stat label="Threat" value={mission.operationalThreat ?? 0} />
        <Stat label="Critical Threads" value={mission.criticalThreads ?? 0} />
        <Stat label="Critical Signals" value={mission.criticalSignals ?? 0} />
        <Stat label="Live Events" value={mission.liveEvents ?? 0} />
      </div>

      <div className={`rounded-[2rem] border p-6 ${statusClass(mission.crisisLevel)}`}>
        <div className="text-xs font-black uppercase tracking-[0.14em]">
          Current Operating Condition
        </div>
        <div className="mt-3 text-3xl font-black">
          {mission.healthStatus || "Unknown"} • {mission.executionMode || "unknown"}
        </div>
        <div className="mt-3 text-sm font-semibold leading-6">
          {data?.nextBestAction || "Open procurement inbox and review workflows."}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Top Operational Priorities" items={priorities} tone="amber" />
        <Panel title="Emergency Directives" items={directives} tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        <Shortcut href="/dashboard/procurement-crisis-center" icon="🚨" title="Crisis Center" />
        <Shortcut href="/dashboard/procurement-war-room" icon="🏛️" title="War Room" />
        <Shortcut href="/dashboard/procurement-situation-room" icon="📡" title="Situation Room" />
        <Shortcut href="/dashboard/procurement-actions" icon="⚡" title="AI Actions" />
        <Shortcut href="/dashboard/procurement-followup-agent" icon="🤖" title="Follow-up AI" />
        <Shortcut href="/dashboard/procurement-inbox-actions" icon="📥" title="Inbox AI" />
        <Shortcut href="/dashboard/procurement-negotiation-agent" icon="🤝" title="Negotiation AI" />
        <Shortcut href="/dashboard/procurement-supplier-reliability" icon="🏭" title="Supplier AI" />
        <Shortcut href="/dashboard/procurement-memory-intelligence" icon="🧠" title="Memory AI" />
        <Shortcut href="/dashboard/procurement-closure-agent" icon="✅" title="Closure AI" />
        <Shortcut href="/dashboard/procurement-autonomous-tasks" icon="🛠️" title="Auto Tasks" />
        <Shortcut href="/dashboard/procurement-task-execution-log" icon="📜" title="Task Log" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function Panel({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "amber" | "rose";
}) {
  const box =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-black text-slate-950">{title}</div>
      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            No urgent items detected.
          </div>
        ) : (
          items.map((item) => (
            <div key={item} className={`rounded-2xl border p-4 text-sm font-bold ${box}`}>
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Shortcut({
  href,
  icon,
  title,
}: {
  href: string;
  icon: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50"
    >
      <div className="text-3xl">{icon}</div>
      <div className="mt-3 text-sm font-black text-slate-950">{title}</div>
    </Link>
  );
}