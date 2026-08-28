import { redirect } from "next/navigation";

import { ADMIN_ROLES } from "@/lib/admin/access-policy";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type EvidenceCount = { label: string; table: string; count: number | null; issue?: string };

const protectedJobRoutes = [
  "/api/cron/boost-expiry", "/api/cron/marketplace-opportunities", "/api/cron/procurement-execution",
  "/api/cron/rfq-followups", "/api/cron/vendor-intelligence-refresh",
  "/api/system/autonomous-vendor-recruitment-refresh", "/api/system/marketplace-expansion-automation-refresh",
  "/api/system/marketplace-intelligence-refresh", "/api/system/marketplace-liquidity-refresh",
  "/api/system/marketplace-promotion-refresh", "/api/system/marketplace-rfq-intelligence-refresh",
  "/api/system/vendor-intelligence-refresh",
] as const;

export default async function SecurityComplianceCenter() {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/security-compliance");
    return <main>Access denied</main>;
  }

  const sources = [
    ["Sign-in and security events", "user_security_events"],
    ["Account restrictions", "admin_account_action_audit"],
    ["Role transitions", "member_role_transition_audit"],
    ["Permanent deletions", "admin_account_deletion_audit"],
    ["Subscription grants", "admin_cash_subscription_audit"],
    ["Moderation decisions", "listing_moderation_events"],
    ["Registration decisions", "registration_verification_events"],
  ] as const;

  const evidence: EvidenceCount[] = await Promise.all(sources.map(async ([label, table]) => {
    const { count, error } = await access.admin.from(table).select("*", { count: "exact", head: true });
    return error ? { label, table, count: null, issue: error.message } : { label, table, count: count ?? 0 };
  }));

  const { data: administrators, error: administratorsError } = await access.admin
    .from("profiles")
    .select("id,role,approval_status,account_status")
    .in("role", [...ADMIN_ROLES])
    .limit(500);

  const adminRows = administrators || [];
  const activeAdmins = adminRows.filter((row) => (row.account_status || "active") === "active" && row.approval_status !== "rejected");
  const masterAdmins = activeAdmins.filter((row) => row.role === "master_admin");
  const delegatedAdmins = activeAdmins.filter((row) => row.role !== "master_admin");
  const issues = [
    ...evidence.flatMap((item) => item.issue ? [`${item.label}: ${item.issue}`] : []),
    ...(administratorsError ? [`Administrator projection: ${administratorsError.message}`] : []),
  ];
  const schedulerConfigured = Boolean(process.env.CRON_SECRET?.trim());
  const panel = { padding: 16, background: "white", border: "1px solid #dbe3ec", borderRadius: 12 };

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <header>
        <h1>Enterprise Security & Compliance</h1>
        <p>Read-only governance over privileged access, security evidence, internal jobs, privacy controls and compliance coverage.</p>
        <p><strong>No secret value, token, personal event payload or deleted-account snapshot is displayed.</strong></p>
        <a href="/admin/dashboard">← Admin Command Center</a>
      </header>

      {issues.length ? <details style={{ marginTop: 12 }}><summary>Partial data notice ({issues.length})</summary>{issues.map((issue) => <p key={issue}>{issue}</p>)}</details> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, margin: "18px 0" }}>
        {[
          ["Active administrators", activeAdmins.length, "Bounded profile projection"],
          ["Master administrators", masterAdmins.length, "Platform-wide authority"],
          ["Delegated administrators", delegatedAdmins.length, "Module capability roles"],
          ["Protected job routes", protectedJobRoutes.length, "Shared fail-closed boundary"],
          ["Scheduler secret", schedulerConfigured ? "Configured" : "Missing", "Presence only; value hidden"],
          ["MFA enforcement", "Not implemented", "No canonical step-up gate"],
        ].map(([label, value, detail]) => <article key={String(label)} style={panel}><small>{label}</small><strong style={{ display: "block", fontSize: 27 }}>{value}</strong><span>{detail}</span></article>)}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 12 }}>
        <article style={panel}>
          <h2>Administrative authority</h2>
          <p>ADMIN-01 provides one server-side resolver, active-account validation, capability-scoped delegated roles and protected privileged Admin APIs.</p>
          <p><strong>{ADMIN_ROLES.length}</strong> administrator roles are code-defined. Capability assignments are not database-versioned, approved or time-bounded.</p>
          <a href="/admin/users">Open Member Administration</a>
        </article>

        <article style={panel}>
          <h2>Internal job boundary</h2>
          <p>All <strong>{protectedJobRoutes.length}</strong> cron and system refresh routes now require a constant-time match against a header-delivered scheduler secret.</p>
          <p>Authorization fails closed when <code>CRON_SECRET</code> is absent. Query-string secrets and implicit scheduler headers are not accepted.</p>
          <p>Production schedulers must send <code>Authorization: Bearer …</code> or <code>x-cron-secret</code>. The secret itself is never exposed here.</p>
        </article>

        <article style={panel}>
          <h2>Security and decision evidence</h2>
          {evidence.map((item) => <p key={item.table}><strong>{item.label}</strong>: {item.count ?? "Unavailable"}</p>)}
          <p>Counts prove records exist, not that retention, completeness or tamper monitoring has been independently certified.</p>
        </article>

        <article style={panel}>
          <h2>Authentication assurance</h2>
          <p>Web sign-in events are recorded through a service-only authority, and mobile session controls include secure storage, reauthentication, inactivity and cold-start protections.</p>
          <p><strong>Gap:</strong> administrator MFA enrollment, AAL2 enforcement, step-up authentication for destructive actions, trusted-device management, session revocation and impossible-travel detection are not centrally implemented.</p>
        </article>

        <article style={panel}>
          <h2>Sensitive actions and separation of duties</h2>
          <p>Role transitions, restrictions, permanent deletions, subscription grants and moderation decisions have domain audit evidence.</p>
          <p><strong>Gap:</strong> permanent deletion, severe suspension, payment reversal, trust downgrade and security-policy changes do not universally require maker-checker or dual approval.</p>
        </article>

        <article style={panel}>
          <h2>Privacy and data governance</h2>
          <p>Privacy, terms and refund policies are published, and account deletion has an immutable founder audit record.</p>
          <p><strong>Not centrally implemented:</strong> data-subject request intake, verified export workflow, retention schedule, legal hold, consent ledger, purpose limitation registry, anonymisation workflow and deletion proof across storage providers.</p>
          <a href="/privacy-policy">Open Privacy Policy</a>
        </article>

        <article style={panel}>
          <h2>Security operations</h2>
          <p>Host status exposes Nginx, Fail2Ban and PM2 evidence, while registration and support centers provide operational triage.</p>
          <p><strong>Gap:</strong> central SIEM, alert correlation, vulnerability-remediation ledger, penetration-test register, incident-response exercises, breach-notification workflow and evidence-preservation procedure.</p>
          <a href="/admin/reliability">Open Reliability Center</a>
        </article>

        <article style={panel}>
          <h2>Compliance status</h2>
          <p>This center is an engineering coverage assessment—not a legal certification of DPDP, GST, PCI DSS, ISO 27001, SOC 2 or any other framework.</p>
          <p>Formal compliance requires counsel, documented ownership, operating evidence, vendor reviews, periodic testing and approved retention policies.</p>
        </article>
      </section>
    </main>
  );
}
