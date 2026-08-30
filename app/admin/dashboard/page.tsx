import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { isAdminRole } from "@/lib/admin/access-policy";
import { loadAdminCommandCenter } from "@/lib/admin/command-center";
import { Activity, AlertTriangle, ArrowRight, Building2, Clock3, Layers3, ShieldCheck, TrendingUp, Users, type LucideIcon } from "lucide-react";
import AdminModuleExplorer from "./AdminModuleExplorer";
import styles from "./AdminCommandCenter.module.css";
import ux from "./AdminCommandCenterUX.module.css";

export const dynamic = "force-dynamic";

function formatNumber(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en-IN").format(value);
}

function roleLabel(role: string) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const metricIcons: Record<string, LucideIcon> = {
  "Platform users": Users,
  "30-day growth": TrendingUp,
  "Verified businesses": Building2,
  "Marketplace supply": Layers3,
  "RFQ activity": Activity,
  "Active subscriptions": ShieldCheck,
};

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?next=/admin/dashboard");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,account_status")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role;
  const accountStatus = profile?.account_status ?? "active";
  if (!isAdminRole(role) || accountStatus !== "active") redirect("/");

  const command = await loadAdminCommandCenter(supabase, role);
  const actionable = command.queues.reduce((total, item) => total + (item.count ?? 0), 0);

  return (
    <main className={styles.page}>
      <div className={styles.commandCenter}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>3Bigha Business Operating System</div>
            <h1>Admin Command Center</h1>
            <p>Operate trust, marketplace activity, growth and platform health from one authority-aware workspace.</p>
          </div>
          <div className={styles.identity}>
            <span className={styles.liveDot} aria-hidden="true" />
            <div><strong>{roleLabel(role)}</strong><span>{user.email ?? "Authenticated administrator"}</span></div>
          </div>
        </header>

        {profileError ? <div className={styles.errorBanner}>Profile status could not be fully loaded: {profileError.message}</div> : null}

        <nav className={styles.commandNav} aria-label="Admin command navigation">
          <Link href="/admin/dashboard" className={styles.activeNav}>Command</Link>
          <Link href={command.queues[0]?.href ?? "/admin/dashboard"}>Work queue</Link>
          {role === "master_admin" ? <Link href="/admin/dashboard/marketplace-intelligence">Intelligence</Link> : null}
          {role === "master_admin" ? <Link href="/admin/dashboard/operations">Platform health</Link> : null}
          <Link href="/">Public platform</Link>
        </nav>

        <section className={styles.statusStrip} aria-label="Command status">
          <div><span>Operating status</span><strong className={styles.healthy}>Active</strong></div>
          <div><span>Items requiring action</span><strong>{formatNumber(actionable)}</strong></div>
          <div><span>Available modules</span><strong>{command.modules.length}</strong></div>
          <div><span>Snapshot</span><strong>{new Date(command.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST</strong></div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}><div><span>Executive view</span><h2>Platform pulse</h2></div><p>Live counts from existing platform authorities</p></div>
          <div className={styles.metricGrid}>
            {command.metrics.map((item) => (
              <Link key={item.label} href={item.href} className={`${styles.metricCard} ${styles[item.tone]}`}>
                <div className={ux.metricLabel}>{(() => { const Icon = metricIcons[item.label] ?? Activity; return <Icon size={17} aria-hidden="true" />; })()}<span>{item.label}</span></div>
                <strong>{formatNumber(item.value)}</strong><small>{item.detail}</small>
              </Link>
            ))}
          </div>
        </section>

        <div className={styles.operatingGrid}>
          <section className={`${styles.section} ${styles.queueSection}`}>
            <div className={styles.sectionHeading}><div><span>Work first</span><h2>Priority queues</h2></div><p>Open the next operational decision</p></div>
            <div className={styles.queueList}>
              {command.queues.map((item) => (
                <Link key={item.label} href={item.href} className={`${styles.queueItem} ${ux.queueItemEnhanced}`}>
                  <span className={`${styles.priority} ${styles[item.priority]}`} />
                  <span className={ux.queueIcon}>{item.priority === "urgent" ? <AlertTriangle size={17} aria-hidden="true" /> : item.priority === "attention" ? <Clock3 size={17} aria-hidden="true" /> : <ShieldCheck size={17} aria-hidden="true" />}</span>
                  <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                  <b>{formatNumber(item.count)}</b><span className={styles.arrow}><ArrowRight size={16} aria-hidden="true" /></span>
                </Link>
              ))}
            </div>
          </section>

          <aside className={styles.controlPanel}>
            <span className={styles.panelEyebrow}>AI-assisted operations</span>
            <h2>Human authority remains final</h2>
            <p>AI signals can prioritise and explain work. Verification, suspension, publication and financial decisions remain attributable administrator actions.</p>
            <div className={styles.controlRules}>
              <div><span>01</span><p><strong>Review evidence</strong>Open the source record before deciding.</p></div>
              <div><span>02</span><p><strong>Record rationale</strong>Use the existing workflow and audit trail.</p></div>
              <div><span>03</span><p><strong>Escalate risk</strong>Move uncertain or high-impact cases to master authority.</p></div>
            </div>
          </aside>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeading}><div><span>Operating system</span><h2>Find your workspace</h2></div><p>Search or filter the modules authorised for your role</p></div>
          <AdminModuleExplorer modules={command.modules} />
        </section>

        {command.dataIssues.length ? (
          <details className={styles.dataNotice}>
            <summary>Partial data notice ({command.dataIssues.length})</summary>
            <p>The command center remains usable, but some live counts could not be read. No value has been estimated.</p>
            <ul>{command.dataIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
          </details>
        ) : null}

        <footer className={styles.footer}><span>ADMIN-02 · Command Center foundation</span><span>Role-scoped · Live authority data · Audit-friendly</span></footer>
      </div>
    </main>
  );
}
