import { redirect } from "next/navigation";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type CountProjection = {
  label: string;
  table: string;
  count: number | null;
  issue?: string;
};

const backgroundJobs = [
  ["Boost expiry", "/api/cron/boost-expiry", "Cron route"],
  ["Marketplace opportunities", "/api/cron/marketplace-opportunities", "Cron route"],
  ["Procurement execution", "/api/cron/procurement-execution", "Cron route"],
  ["RFQ follow-ups", "/api/cron/rfq-followups", "Cron route"],
  ["Vendor intelligence", "/api/cron/vendor-intelligence-refresh", "Cron route"],
  ["Vendor recruitment", "/api/system/autonomous-vendor-recruitment-refresh", "System refresh"],
  ["Marketplace expansion", "/api/system/marketplace-expansion-automation-refresh", "System refresh"],
  ["Marketplace intelligence", "/api/system/marketplace-intelligence-refresh", "System refresh"],
  ["Liquidity scoring", "/api/system/marketplace-liquidity-refresh", "System refresh"],
  ["Promotion intelligence", "/api/system/marketplace-promotion-refresh", "System refresh"],
  ["RFQ intelligence", "/api/system/marketplace-rfq-intelligence-refresh", "System refresh"],
  ["Vendor intelligence system", "/api/system/vendor-intelligence-refresh", "System refresh"],
] as const;

const scaleRisks = [
  "Broad select-all query patterns remain in administrative and marketplace code.",
  "Some operational pages load thousands of rows and aggregate them in memory.",
  "Repeated exact counts have no shared query budget or incremental KPI projection.",
  "Admin work queues do not universally use server-side cursor pagination.",
  "Database latency, pool pressure and slow-query evidence are not visible in the application.",
];

export default async function ReliabilityCommandCenter() {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/reliability");
    return <main>Access denied</main>;
  }

  const sources = [
    ["Operational events", "operational_events"],
    ["Registration alerts", "registration_operations_notifications"],
    ["Security events", "user_security_events"],
    ["Vendor conversion events", "vendor_conversion_events"],
    ["LGD import runs", "geo_lgd_import_runs"],
  ] as const;

  const projections: CountProjection[] = await Promise.all(sources.map(async ([label, table]) => {
    const { count, error } = await access.admin.from(table).select("*", { count: "exact", head: true });
    return error ? { label, table, count: null, issue: error.message } : { label, table, count: count ?? 0 };
  }));

  const { data: alerts, error: alertsError } = await access.admin
    .from("registration_operations_notifications")
    .select("id,severity,title,status,last_detected_at")
    .neq("status", "resolved")
    .order("last_detected_at", { ascending: false })
    .limit(20);

  const issues = [
    ...projections.flatMap((item) => item.issue ? [`${item.label}: ${item.issue}`] : []),
    ...(alertsError ? [`Registration alert projection: ${alertsError.message}`] : []),
  ];
  const openAlerts = alerts || [];
  const criticalAlerts = openAlerts.filter((alert) => alert.severity === "critical").length;
  const panel = { padding: 16, background: "white", border: "1px solid #dbe3ec", borderRadius: 12 };

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <header>
        <h1>Observability, Scale & Reliability</h1>
        <p>Read-only operating evidence for runtime health, background work, domain signals, scale exposure and recovery coverage.</p>
        <p>This center does not execute jobs, restart services, alter infrastructure or claim health without recorded evidence.</p>
        <a href="/admin/dashboard">← Admin Command Center</a>
      </header>

      {issues.length ? <details style={{ marginTop: 12 }}><summary>Partial data notice ({issues.length})</summary>{issues.map((issue) => <p key={issue}>{issue}</p>)}</details> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, margin: "18px 0" }}>
        {[
          ["Background routes", backgroundJobs.length, "Code-discovered jobs"],
          ["Operational sources", projections.length, "Distributed domain evidence"],
          ["Open trust alerts", openAlerts.length, "Bounded live projection"],
          ["Critical alerts", criticalAlerts, "Requires human review"],
          ["Durable metrics", "Unavailable", "No central metrics store"],
          ["Defined admin SLOs", 0, "No canonical SLO registry"],
        ].map(([label, value, detail]) => <article key={String(label)} style={panel}><small>{label}</small><strong style={{ display: "block", fontSize: 28 }}>{value}</strong><span>{detail}</span></article>)}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 12 }}>
        <article style={panel}>
          <h2>Runtime operations authority</h2>
          <p>The existing protected Operations route reports server uptime, memory, disk, load, Nginx, Fail2Ban, Git version, PM2 processes, deployment history and host health-log output.</p>
          <p>Those values are live host observations—not durable time-series metrics or an external availability guarantee.</p>
          <a href="/admin/dashboard/operations">Open Production Operations</a>
        </article>

        <article style={panel}>
          <h2>Recorded operating evidence</h2>
          {projections.map((item) => <p key={item.table}><strong>{item.label}</strong>: {item.count ?? "Unavailable"}</p>)}
          <p>These tables have different domain meanings and retention rules. Their counts must not be combined into a synthetic platform-health score.</p>
        </article>

        <article style={panel}>
          <h2>Background processing inventory</h2>
          <p><strong>{backgroundJobs.length}</strong> cron/system refresh routes are present.</p>
          {backgroundJobs.map(([name, route, kind]) => <p key={route}><strong>{name}</strong> · {kind}<br /><code>{route}</code></p>)}
          <p>No job is invoked from this page. Scheduler authentication is inconsistent, and there is no canonical run ledger with attempt, duration, outcome, retry and correlation ID.</p>
        </article>

        <article style={panel}>
          <h2>Application telemetry coverage</h2>
          <p><code>withRequestTimer</code> emits structured request timing and errors, but current adoption is limited to the OpenAI runtime and output remains console-based.</p>
          <p>Many routes use unstructured console logging. Central log ingestion, metrics, distributed traces, correlation IDs, sampling policy, alert rules and privacy-safe redaction policy are not implemented universally.</p>
        </article>

        <article style={panel}>
          <h2>Active operational alerts</h2>
          {openAlerts.slice(0, 10).map((alert) => <p key={alert.id}><strong>{alert.severity}: {alert.title}</strong><br />{alert.status} · {new Date(alert.last_detected_at).toLocaleString("en-IN")}</p>)}
          {!openAlerts.length ? <p>No open registration alert appears in the bounded projection. This does not prove overall platform health.</p> : null}
          <a href="/admin/verification-notifications">Open Registration Alerts</a>
        </article>

        <article style={panel}>
          <h2>Scale-readiness findings</h2>
          {scaleRisks.map((risk) => <p key={risk}>• {risk}</p>)}
          <p>Required direction: indexed filters, cursor queues, bounded exports, read models, incremental KPIs, caching rules and database query observability.</p>
        </article>

        <article style={panel}>
          <h2>SLO and incident coverage</h2>
          <p><strong>Not centrally implemented:</strong> availability, latency and error-rate SLOs; service ownership; error budgets; alert routing; incident severity; incident timeline; post-incident review; maintenance windows and public status communication.</p>
          <p>Registration operations alerts and support tickets remain domain authorities, not a substitute for an incident-management system.</p>
          <a href="/admin/support-operations">Open Support Operations</a>
        </article>

        <article style={panel}>
          <h2>Backup and recovery coverage</h2>
          <p><strong>Unavailable in application evidence:</strong> latest successful database backup, retention, encryption, restore-test date, restore duration, recovery point objective, recovery time objective and media-storage recovery status.</p>
          <p>Host or Supabase dashboards may provide external evidence, but this application currently has no canonical backup/restore verification record. No recovery action is available here.</p>
        </article>
      </section>
    </main>
  );
}
