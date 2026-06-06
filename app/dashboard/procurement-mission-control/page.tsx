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

  let recoveryData: any = null;
  let cognitionData: any = null;

  try {
    const origin = await getOrigin();

    const recoveryRes = await fetch(
      `${origin}/api/ai/procurement-recovery-command-center`,
      {
        cache: "no-store",
      }
    );

    recoveryData = await recoveryRes.json();
  } catch {
    recoveryData = { ok: false };
  }

  try {
    const origin = await getOrigin();

    const cognitionRes = await fetch(
      `${origin}/api/ai/procurement-unified-cognition`,
      {
        cache: "no-store",
      }
    );

    cognitionData = await cognitionRes.json();
  } catch {
    cognitionData = { ok: false };
  }

  const cognition =
    cognitionData?.cognition || {};

  const recoveryItems = Array.isArray(
    recoveryData?.recovery
  )
    ? recoveryData.recovery
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-rose-950 p-7 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
          Enterprise Procurement Work Desk
        </div>

        <h1 className="mt-4 text-4xl font-black">
          AI Procurement Work Desk
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-13">
        <Stat label="Health" value={`${mission.healthScore ?? 0}/100`} />
        <Stat label="Crisis" value={mission.crisisLevel || "unknown"} />
        <Stat label="Threat" value={mission.operationalThreat ?? 0} />
        <Stat label="Critical Threads" value={mission.criticalThreads ?? 0} />
        <Stat label="Critical Signals" value={mission.criticalSignals ?? 0} />
        <Stat label="Live Events" value={mission.liveEvents ?? 0} />

        <Stat
          label="Operational Load"
          value={mission.operationalLoad ?? 0}
        />

        <Stat
          label="Recovery Pressure"
          value={mission.recoveryPressure ?? 0}
        />

        <Stat
          label="Stale Threads"
          value={mission.staleConversations ?? 0}
        />
      </div>

      <div className={`rounded-[2rem] border p-6 ${
        cognition.predictiveRisk === "critical"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : cognition.predictiveRisk === "high"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : cognition.predictiveRisk === "elevated"
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em]">
              Predictive Procurement Cognition
            </div>

            <div className="mt-3 text-3xl font-black">
              {cognition.trajectory || "stable"} • {cognition.predictiveRisk || "low"}
            </div>

            <div className="mt-3 max-w-3xl text-sm font-semibold leading-6">
              {cognitionData?.executiveSummary ||
                "Procurement cognition stable."}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/40 bg-white/50 px-5 py-3 text-sm font-black">
              Cognition {cognition.cognitionScore || 0}
            </div>

            <div className="rounded-2xl border border-white/40 bg-white/50 px-5 py-3 text-sm font-black">
              Drift {cognition.operationalDrift || 0}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {cognition.silentRiskDetected ? (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
              Silent operational weakening detected
            </span>
          ) : null}

          {cognition.escalationLikely ? (
            <span className="inline-flex rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-black text-rose-800">
              Escalation pressure rising
            </span>
          ) : null}

          {cognition.recoveryLikely ? (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              Recovery likely with intervention
            </span>
          ) : null}
        </div>

        <div className="mt-5 rounded-2xl border border-white/30 bg-white/40 px-5 py-4 text-sm font-bold">
          {cognitionData?.nextBestAction ||
            "Continue procurement operational monitoring."}
        </div>

        {Array.isArray(cognition.reasons) &&
        cognition.reasons.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {cognition.reasons.slice(0, 4).map((reason: string) => (
              <div
                key={reason}
                className="rounded-2xl border border-white/30 bg-white/40 px-4 py-3 text-sm font-bold"
              >
                {reason}
              </div>
            ))}
          </div>
        ) : null}
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

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              AI Procurement Recovery Work Desk
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Unified recovery orchestration, stabilization intelligence and operational readiness monitoring.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700">
              Readiness: {recoveryData?.readinessScore || 0}
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700">
              Stabilization: {recoveryData?.stabilizationScore || 0}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-bold text-violet-800">
          {recoveryData?.operationalRecovery}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {recoveryItems.map((item: any) => (
            <div
              key={item.title}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                    item.severity === "Critical"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : item.severity === "High"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : item.severity === "Medium"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {item.severity}
                </span>
              </div>

              <div className="mt-4 text-2xl font-black text-slate-950">
                {item.title}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm font-black text-slate-700">
                  <span>Recovery Probability</span>
                  <span>{item.probability}%</span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      item.probability >= 80
                        ? "bg-emerald-500"
                        : item.probability >= 60
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{
                      width: `${item.probability}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                🤖 {item.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        <Shortcut href="/dashboard/procurement-crisis-center" icon="🚨" title="Issue Center" />
        <Shortcut href="/dashboard/procurement-os" icon="🧭" title="Procurement Workspace" />
        <Shortcut href="/dashboard/procurement-war-room" icon="🏛️" title="Priority Work" />
        <Shortcut href="/dashboard/procurement-situation-room" icon="📡" title="Work Updates" />
        <Shortcut href="/dashboard/procurement-heatmap" icon="🔥" title="Risk Overview" />
        <Shortcut href="/dashboard/procurement-actions" icon="⚡" title="Pending Actions" />
        <Shortcut href="/dashboard/procurement-followup-agent" icon="🤖" title="Follow-up AI" />
        <Shortcut href="/dashboard/procurement-inbox-actions" icon="📥" title="Inbox Help" />
        <Shortcut href="/dashboard/procurement-negotiation-agent" icon="🤝" title="Negotiation" />
        <Shortcut href="/dashboard/procurement-supplier-reliability" icon="🏭" title="Supplier Overview" />
        <Shortcut href="/dashboard/procurement-memory-intelligence" icon="🧠" title="Recent Workflow" />
        <Shortcut href="/dashboard/procurement-closure-agent" icon="✅" title="Closure Tracking" />
        <Shortcut href="/dashboard/procurement-autonomous-tasks" icon="🛠️" title="Pending Tasks" />
        <Shortcut href="/dashboard/procurement-task-execution-log" icon="📜" title="Activity Log" />
        <Shortcut href="/dashboard/procurement-real-execution" icon="🚀" title="Real Execute" />
        <Shortcut href="/dashboard/procurement-crisis-center" icon="🛡️" title="Recovery Command" />
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