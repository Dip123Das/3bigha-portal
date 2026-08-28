import { redirect } from "next/navigation";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type QueryResult = { data: any[] | null; error: { message: string } | null };
const clean = (value: unknown) => String(value ?? "—").replaceAll("_", " ");

export default async function SupportOperationsCenter() {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/support-operations");
    return <main>Access denied</main>;
  }

  const [tickets, messages, accountActions, moderationEvents, paymentReviews] = (await Promise.all([
    access.admin.from("support_tickets").select("id,ticket_no,user_id,user_email,user_role,category,status,priority,assigned_to,escalation_level,sla_deadline,waiting_for_user,ai_risk_flag,ai_issue_category,ai_urgency,created_at,updated_at,resolved_at").order("updated_at", { ascending: false }).limit(2000),
    access.admin.from("support_ticket_messages").select("id,ticket_id,sender_id,sender_role,is_admin_message,created_at").order("created_at", { ascending: false }).limit(5000),
    access.admin.from("admin_account_action_audit").select("id,target_user_id,action,reason,created_at").order("created_at", { ascending: false }).limit(1000),
    access.admin.from("listing_moderation_events").select("id,listing_entity_type,listing_entity_id,event_type,reason_code,notes,actor_user_id,created_at").order("created_at", { ascending: false }).limit(1000),
    access.admin.from("subscription_payment_requests").select("id,user_id,subscription_plan,amount_paise,status,verification_status,created_at,updated_at").eq("status", "review_required").order("updated_at", { ascending: false }).limit(500),
  ])) as QueryResult[];

  const results = [tickets, messages, accountActions, moderationEvents, paymentReviews];
  const issues = results.flatMap((result) => result.error ? [result.error.message] : []);
  const rows = tickets.data || [];
  const open = rows.filter((row) => !["resolved", "closed"].includes(row.status));
  const escalated = open.filter((row) => row.status === "escalated" || Number(row.escalation_level || 0) > 0);
  const breached = open.filter((row) => row.sla_deadline && Date.parse(row.sla_deadline) < Date.now());
  const waiting = open.filter((row) => row.status === "waiting_user" || row.waiting_for_user === true);
  const unassigned = open.filter((row) => !row.assigned_to);
  const highRisk = open.filter((row) => row.ai_risk_flag && row.ai_risk_flag !== "none");
  const categories = new Map<string, number>();
  for (const row of open) categories.set(row.category || "general", (categories.get(row.category || "general") || 0) + 1);
  const messageCounts = new Map<string, number>();
  for (const row of messages.data || []) messageCounts.set(row.ticket_id, (messageCounts.get(row.ticket_id) || 0) + 1);
  const panel = { padding: 16, background: "white", border: "1px solid #dbe3ec", borderRadius: 12 };

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <header>
        <h1>Support, Complaints & Appeals Center</h1>
        <p>Read-only triage across written tickets, SLA risk, escalations and adjacent account, moderation and payment-review authorities.</p>
        <a href="/admin/dashboard">← Admin Command Center</a>
      </header>

      {issues.length ? <details style={{ marginTop: 12 }}><summary>Partial data notice ({issues.length})</summary>{issues.map((issue, index) => <p key={`${issue}-${index}`}>{issue}</p>)}</details> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, margin: "18px 0" }}>
        {[
          ["Open tickets", open.length, "Not resolved or closed"],
          ["SLA breached", breached.length, "Deadline passed"],
          ["Escalated", escalated.length, "Status or escalation level"],
          ["Waiting for member", waiting.length, "Written response required"],
          ["Unassigned", unassigned.length, "Needs ownership"],
          ["Risk flagged", highRisk.length, "AI advisory signal"],
        ].map(([label, value, helper]) => <article key={String(label)} style={panel}><small>{label}</small><strong style={{ display: "block", fontSize: 28 }}>{value}</strong><span>{helper}</span></article>)}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 12 }}>
        <article style={panel}>
          <h2>Needs attention</h2>
          {[...breached, ...escalated, ...highRisk].filter((row, index, all) => all.findIndex((item) => item.id === row.id) === index).slice(0, 18).map((ticket) => <p key={ticket.id}><strong>{ticket.ticket_no}</strong> · {clean(ticket.priority)}<br />{clean(ticket.category)} · {clean(ticket.status)} · {messageCounts.get(ticket.id) || 0} messages<br /><a href={`/admin/dashboard/support/${ticket.id}`}>Open authoritative ticket</a></p>)}
          {!breached.length && !escalated.length && !highRisk.length ? <p>No urgent support signal in the bounded projection.</p> : null}
        </article>

        <article style={panel}>
          <h2>Queue distribution</h2>
          {[...categories.entries()].sort((a, b) => b[1] - a[1]).map(([category, count]) => <p key={category}><strong>{clean(category)}</strong> · {count}</p>)}
          {!categories.size ? <p>No open category in the bounded projection.</p> : null}
          <a href="/admin/dashboard/support">Open Support Desk</a>
        </article>

        <article style={panel}>
          <h2>Human and AI authority</h2>
          <p>AI issue category, urgency, risk and suggested summaries are advisory. Human administrators retain final reply, status, escalation and resolution authority.</p>
          <p>AI-generated summaries and reply suggestions are not durably versioned as support decision evidence.</p>
          <p>No reply or ticket mutation is available from this center.</p>
        </article>

        <article style={panel}>
          <h2>Adjacent governed actions</h2>
          <p><strong>{accountActions.data?.length || 0}</strong> recent account-action audit records remain in Member Administration.</p>
          <p><strong>{moderationEvents.data?.length || 0}</strong> recent moderation events remain in the AI Moderation Center.</p>
          <p><strong>{paymentReviews.data?.length || 0}</strong> SBI payment requests require verification review.</p>
          <a href="/admin/users">Members</a>{" · "}<a href="/admin/moderation">Moderation</a>{" · "}<a href="/admin/revenue-control">Revenue</a>
        </article>

        <article style={panel}>
          <h2>Appeal and dispute coverage</h2>
          <p>General complaints can be submitted as support tickets, but there is no dedicated moderation appeal, suspension appeal, payment dispute, refund case or abuse-report lifecycle.</p>
          <p>Account actions, moderation events and payment reviews are visible as adjacent evidence only; they are not linked into a unified appeal timeline.</p>
        </article>

        <article style={panel}>
          <h2>Governance gaps</h2>
          <p><strong>Not centrally implemented:</strong> case evidence attachments, consented chat review, assignment audit, status-transition audit, decision reasons, reopening history, appeal deadlines, dual approval, escalation policy versions and outcome notifications audit.</p>
          <p>The current Support Desk remains the canonical execution workflow until a governed case authority is approved.</p>
        </article>
      </section>
    </main>
  );
}
