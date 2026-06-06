import Link from "next/link";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import { headers } from "next/headers";
import WorkflowContinuityBar from "@/components/workflow-continuity/WorkflowContinuityBar";
import WorkflowContinuityRecorder from "@/components/workflow-continuity/WorkflowContinuityRecorder";
import OperationalEventStream from "@/components/operational-events/OperationalEventStream";
import OperationalEventRecorder from "@/components/operational-events/OperationalEventRecorder";

async function getOrigin() {
  const h = await headers();

  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";

  return host.startsWith("http")
    ? host
    : `${proto}://${host}`;
}

const MODULES = [
  ["🚨", "Work Updates", "/dashboard/procurement-situation-room", "Live procurement operations overview"],
  ["⚡", "Activity Feed", "/dashboard/procurement-live", "Live workflow and procurement activity"],
  ["🔥", "Heatmap Analysis", "/dashboard/procurement-heatmap", "Zone, category and workflow heatmap"],
  ["📈", "Shortage Forecast", "/dashboard/procurement-analytics", "Material shortage and supplier pressure forecast"],
  ["🛰️", "Work Desk", "/dashboard/procurement-mission-control", "Central procurement operations workspace"],
  ["🏛️", "Priority Work", "/dashboard/procurement-war-room", "Critical procurement coordination workspace"],
  ["🛡️", "Issue Center", "/dashboard/procurement-crisis-center", "Issue escalation and recovery workspace"],
  ["🏭", "Supplier Reliability", "/dashboard/procurement-supplier-reliability", "Supplier response and reliability overview"],
  ["📥", "Inbox Actions", "/dashboard/procurement-inbox-actions", "Inbox follow-up and rerouting support"],
  ["🤖", "Follow-up Support", "/dashboard/procurement-followup-agent", "Follow-up and recovery assistance"],
  ["🤝", "Negotiation Guidance", "/dashboard/procurement-negotiation-agent", "Negotiation and supplier discussion support"],
  ["🧩", "Pending Actions", "/dashboard/procurement-actions", "Workflow execution and operational actions"],
  ["🛠️", "Pending Tasks", "/dashboard/procurement-autonomous-tasks", "Automatic task and reminder queue"],
  ["🚀", "Real Execute", "/dashboard/procurement-real-execution", "Execution preparation and readiness"],
  ["📜", "Activity Log", "/dashboard/procurement-task-execution-log", "Execution history log"],
  ["🧠", "Procurement Guidance", "/dashboard/procurement-copilot", "Get procurement workflow assistance"],
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
      <WorkflowContinuityRecorder
        state={{
          id: "procurement-os",
          module: "procurement",
          stage: "review",
          title: "Procurement Operations Desk",
          summary: "Continue supplier coordination, follow-up, risk review and execution planning.",
          href: "/dashboard/procurement-os",
          primaryActionLabel: "Open Procurement Desk",
          updatedAt: Date.now(),
        }}
      />

      <OperationalEventRecorder
        event={{
          id: "procurement-os-opened",
          module: "procurement",
          title: "Procurement workspace opened",
          detail: "Review supplier coordination, follow-up, risk and execution activity.",
          href: "/dashboard/procurement-os",
          tone: "info",
          createdAt: Date.now(),
        }}
      />

      <div className="mx-auto max-w-7xl">
        <WorkflowContinuityBar />
        <OperationalEventStream
          title="Recent procurement activity"
          limit={6}
        />
        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-600">
            3bigha Procurement Operations Desk
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Procurement Operations Desk
          </h1>

          <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-slate-600">
            One place to manage procurement workflows, supplier coordination, follow-up, recovery, forecasting and execution tasks.
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
              className="proc-shell-xl transition hover:-translate-y-1 hover:shadow-lg"
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
    <div className="proc-shell">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}