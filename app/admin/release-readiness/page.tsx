import { redirect } from "next/navigation";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

const migrations = [
  "20260822000100_trusted_listing_media_foundation.sql",
  "20260827000100_admin_listing_media_moderation.sql",
  "20260827000200_user_security_event_authority.sql",
] as const;

const provenGates = [
  "ADMIN-01 through ADMIN-15 architecture assertions pass.",
  "Trusted Listing Media authority assertions pass.",
  "TypeScript compiles without errors.",
  "Next.js 14.2.35 production build completes with 327 routes.",
  "The release branch is a linear descendant of the audited main baseline.",
  "All cron and system refresh routes use the shared fail-closed scheduler boundary.",
] as const;

const pendingGates = [
  "Rehearse all three migrations against a production-like database snapshot.",
  "Verify RLS, grants, functions, triggers and private evidence storage after migration.",
  "Configure CRON_SECRET and update every production scheduler request header.",
  "Run authenticated browser smoke tests for every Admin command surface.",
  "Complete accessibility, mobile responsiveness, load and penetration testing.",
  "Record a successful database and media restore rehearsal with RPO and RTO evidence.",
  "Review and disposition the 21 known locked production dependency advisories.",
  "Obtain founder, security and operations acceptance before merge or deployment.",
] as const;

function present(value: string | undefined) {
  return Boolean(value?.trim());
}

export default async function AdminReleaseReadinessPage() {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/release-readiness");
    return <main>Access denied</main>;
  }

  const environment = [
    ["Supabase URL", present(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ["Supabase public key", present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)],
    ["Supabase service authority", present(process.env.SUPABASE_SERVICE_ROLE_KEY)],
    ["Canonical site URL", present(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL)],
    ["Internal scheduler secret", present(process.env.CRON_SECRET)],
  ] as const;
  const configured = environment.filter(([, ready]) => ready).length;
  const panel = { padding: 16, background: "white", border: "1px solid #dbe3ec", borderRadius: 12 };

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <header>
        <h1>Admin BOS Production Readiness</h1>
        <p>Evidence-backed closure gate for the Admin Business Operating System release branch.</p>
        <p><strong>Status: implementation verified; production release not yet approved.</strong></p>
        <p>No secret value is displayed, and no merge, migration, deployment, tag or production command can be executed here.</p>
        <a href="/admin/dashboard">← Admin Command Center</a>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, margin: "18px 0" }}>
        {[
          ["Admin phases", "01–16", "Closure sequence"],
          ["Auditable commits", 25, "Including this closure phase"],
          ["Additive migrations", migrations.length, "Not applied by this phase"],
          ["Build routes", 327, "Latest verified production build"],
          ["Required environment", `${configured}/${environment.length}`, "Presence only"],
          ["Release decision", "Pending", "Human approval required"],
        ].map(([label, value, detail]) => <article key={String(label)} style={panel}><small>{label}</small><strong style={{ display: "block", fontSize: 27 }}>{value}</strong><span>{detail}</span></article>)}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 12 }}>
        <article style={panel}>
          <h2>Verified engineering gates</h2>
          {provenGates.map((gate) => <p key={gate}>✓ {gate}</p>)}
          <p>These results validate the source branch and command-scoped build environment; they do not prove production database or infrastructure state.</p>
        </article>

        <article style={panel}>
          <h2>Blocking production gates</h2>
          {pendingGates.map((gate) => <p key={gate}>○ {gate}</p>)}
          <p>Production approval remains blocked until every item has named evidence and an accountable human owner.</p>
        </article>

        <article style={panel}>
          <h2>Environment readiness</h2>
          {environment.map(([label, ready]) => <p key={label}><strong>{label}</strong>: {ready ? "Configured" : "Missing"}</p>)}
          <p>Presence does not validate correctness, least privilege, rotation, connectivity or environment parity. Values are never rendered.</p>
        </article>

        <article style={panel}>
          <h2>Migration order</h2>
          {migrations.map((migration, index) => <p key={migration}><strong>{index + 1}.</strong> <code>{migration}</code></p>)}
          <p>Before application: snapshot, dry run and inspect SQL. After application: verify tables, indexes, RLS, grants, functions, triggers, storage policy and trusted-media publication behavior.</p>
        </article>

        <article style={panel}>
          <h2>Deployment sequence</h2>
          <p>1. Freeze and identify the approved commit.</p>
          <p>2. Back up database and private media evidence.</p>
          <p>3. Configure and verify environment prerequisites.</p>
          <p>4. Rehearse, then apply migrations in timestamp order.</p>
          <p>5. Build the approved commit and deploy without changing schema automatically.</p>
          <p>6. Run authentication, Admin, TLM, scheduler and public-route smoke tests.</p>
          <p>7. Observe error, resource and business signals before acceptance.</p>
        </article>

        <article style={panel}>
          <h2>Rollback boundary</h2>
          <p>If application verification fails, restore the previous application commit first and keep the additive schema in place unless a reviewed database rollback is explicitly approved.</p>
          <p>If migration verification fails, stop deployment, preserve evidence and restore from the pre-migration snapshot. Never improvise destructive SQL in production.</p>
          <p>Rotate exposed credentials immediately if any secret enters logs, URLs, screenshots or repository history.</p>
        </article>

        <article style={panel}>
          <h2>Acceptance evidence</h2>
          <p>Required record: approved commit, migration output, RLS checks, scheduler authentication tests, smoke-test results, accessibility result, load result, security result, restore evidence, monitoring window, rollback owner and final sign-off.</p>
          <p>A release tag may be created only after deployment and operational acceptance. ADMIN-16 does not create one.</p>
        </article>

        <article style={panel}>
          <h2>Release references</h2>
          <p><a href="/admin/security-compliance">Security & Compliance</a> · <a href="/admin/reliability">Reliability</a> · <a href="/admin/platform-governance">Platform Governance</a> · <a href="/admin/dashboard/operations">Production Operations</a></p>
          <p>The repository closure checklist is stored at <code>docs/admin/ADMIN-16-RELEASE-READINESS.md</code>.</p>
        </article>
      </section>
    </main>
  );
}
