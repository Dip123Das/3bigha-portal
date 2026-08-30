import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import { loadTrustCommandCenter } from "@/lib/admin/trust-command-center";
import styles from "./TrustCommandCenter.module.css";

export const dynamic = "force-dynamic";

const format = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-IN").format(value);
const clean = (value: string) => value.replaceAll("_", " ");

export default async function VerificationOperationsPage() {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/verification-operations");
    return <main className={styles.denied}>Master administrator access is required.</main>;
  }

  const command = await loadTrustCommandCenter(access.admin);
  const totalQueue = command.queues.reduce((sum, item) => sum + (item.count ?? 0), 0);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><span>ADMIN-03 · Trust operations</span><h1>Trust & Verification Center</h1><p>One operating view for registration, identity, GPS evidence, AI mismatches, fraud investigation and account restrictions.</p></div>
          <div className={styles.headerStatus}><i /><div><strong>Human authority active</strong><small>{format(totalQueue)} review signals</small></div></div>
        </header>

        <nav className={styles.nav} aria-label="Trust center navigation">
          <Link className={styles.active} href="/admin/verification-operations">Trust center</Link>
          <Link href="/admin/verification-workbench">Team queue</Link>
          <Link href="/admin/verification-reviews">Business reviews</Link>
          <Link href="/admin/individual-professional-reviews">Skilled workers</Link>
          <Link href="/admin/verification-notifications">Fraud alerts</Link>
          <Link href="/admin/users">Suspensions</Link>
          <Link href="/admin/dashboard">Admin command</Link>
        </nav>

        <section className={styles.metrics} aria-label="Trust metrics">
          {command.metrics.map((item) => <article key={item.label} className={styles[item.tone]}><span>{item.label}</span><strong>{format(item.value)}</strong><small>{item.detail}</small></article>)}
        </section>

        <div className={styles.workspace}>
          <section className={styles.panel}>
            <div className={styles.sectionTitle}><div><span>Operational queues</span><h2>Decisions requiring attention</h2></div><small>Source workflows remain authoritative</small></div>
            <div className={styles.queueGrid}>
              {command.queues.map((item) => (
                <Link key={item.label} href={item.href} className={styles.queueCard}>
                  <i className={styles[item.priority]} /><div><strong>{item.label}</strong><p>{item.detail}</p></div><b>{format(item.count)}</b><span>Open →</span>
                </Link>
              ))}
            </div>
          </section>

          <aside className={styles.governance}>
            <span>Trust doctrine</span><h2>Evidence before decision</h2>
            <p>AI confidence is advisory. Administrators must review canonical records and preserve the existing decision trail.</p>
            <ol>
              <li><b>Validate provenance</b><small>Confirm identity, device capture, GPS and timestamps.</small></li>
              <li><b>Compare declarations</b><small>Review documents, media, business claims and mismatch signals.</small></li>
              <li><b>Apply proportionate action</b><small>Approve, request correction, restrict, suspend or escalate.</small></li>
              <li><b>Record accountability</b><small>Every material human decision must retain its reason and actor.</small></li>
            </ol>
          </aside>
        </div>

        <section className={styles.panel}>
          <div className={styles.sectionTitle}><div><span>SLA command</span><h2>Oldest unresolved registrations</h2></div><small>{format(command.recentDecisionCount)} decisions · {format(command.activeReviewerCount)} active reviewers in 7 days</small></div>
          {command.oldestCases.length ? (
            <div className={styles.caseTable} role="table" aria-label="Oldest verification cases">
              <div className={styles.tableHead} role="row"><span>Status</span><span>Age</span><span>Priority</span><span>Ownership</span><span>Action</span></div>
              {command.oldestCases.map((item) => (
                <div key={item.id} className={styles.tableRow} role="row">
                  <strong>{clean(item.status)}</strong><span>{item.ageHours}h</span><span>{clean(item.priority)}</span><span>{item.assigned ? "Assigned" : "Unassigned"}</span><Link href={item.href}>Review →</Link>
                </div>
              ))}
            </div>
          ) : <div className={styles.clearState}>No unresolved registration case is currently in the queue.</div>}
        </section>

        <section className={styles.actionMap}>
          <div><span>Approve or correct</span><p>Use the existing registration or skilled-worker review page.</p></div>
          <div><span>Investigate fraud</span><p>Open alerts, evidence and cross-verification before action.</p></div>
          <div><span>Suspend or restrict</span><p>Use Member Administration; self-action and master-admin changes remain blocked.</p></div>
          <div><span>Manual AI override</span><p>Override only in the authoritative review workflow with a recorded rationale.</p></div>
        </section>

        {command.issues.length ? <details className={styles.notice}><summary>Partial data notice ({command.issues.length})</summary><p>Unavailable values are shown as “—”; no trust metric has been estimated.</p><ul>{command.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></details> : null}

        <footer className={styles.footer}><span>Snapshot {new Date(command.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span><span>Read-only command layer · Existing workflows preserved</span></footer>
      </div>
    </main>
  );
}
