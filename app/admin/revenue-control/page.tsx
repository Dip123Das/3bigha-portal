import { redirect } from "next/navigation";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import { SBI_GATEWAY_PROVIDER, SBI_INTEGRATION_READY, SUBSCRIPTION_PLANS } from "@/lib/payments/sbi";

export const dynamic = "force-dynamic";

type QueryResult = { data: any[] | null; error: { message: string } | null };

const clean = (value: unknown) => String(value ?? "—").replaceAll("_", " ");
const rupees = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export default async function RevenueControlCenter() {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/revenue-control");
    return <main>Access denied</main>;
  }

  const [payments, subscriptions, cashAudit] = (await Promise.all([
    access.admin
      .from("subscription_payment_requests")
      .select("id,user_id,provider,subscription_plan,amount_paise,currency,status,gateway_transaction_id,verification_status,paid_at,expires_at,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(2000),
    access.admin
      .from("business_profiles")
      .select("user_id,business_name,subscription_plan,subscription_status,subscription_expires_at,updated_at")
      .not("subscription_plan", "is", null)
      .order("updated_at", { ascending: false })
      .limit(2000),
    access.admin
      .from("admin_cash_subscription_audit")
      .select("id,user_id,subscription_plan,amount,currency,receipt_reference,subscription_expires_at,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ])) as QueryResult[];

  const issues = [payments, subscriptions, cashAudit].flatMap((result) => result.error ? [result.error.message] : []);
  const paymentRows = payments.data || [];
  const subscriptionRows = subscriptions.data || [];
  const paidRows = paymentRows.filter((row) => row.status === "paid" && row.gateway_transaction_id && row.paid_at);
  const settledRevenuePaise = paidRows.reduce((sum, row) => sum + Number(row.amount_paise || 0), 0);
  const pendingRows = paymentRows.filter((row) => ["created", "gateway_configuration_pending", "gateway_order_created", "payment_pending"].includes(row.status));
  const failedRows = paymentRows.filter((row) => ["failed", "expired", "cancelled"].includes(row.status));
  const reviewRows = paymentRows.filter((row) => row.status === "review_required");
  const activeSubscriptions = subscriptionRows.filter((row) => row.subscription_status === "active");
  const renewalCutoff = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const renewals = activeSubscriptions.filter((row) => row.subscription_expires_at && Date.parse(row.subscription_expires_at) <= renewalCutoff);
  const planCounts = new Map<string, number>();
  for (const row of activeSubscriptions) planCounts.set(row.subscription_plan || "unknown", (planCounts.get(row.subscription_plan || "unknown") || 0) + 1);
  const panel = { padding: 16, background: "white", border: "1px solid #dbe3ec", borderRadius: 12 };

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <header>
        <h1>Billing, Subscription & Revenue Center</h1>
        <p>Settled payment evidence, subscription entitlements, renewals and revenue-governance coverage.</p>
        <a href="/admin/dashboard">← Admin Command Center</a>
      </header>

      {issues.length ? <details style={{ marginTop: 12 }}><summary>Partial data notice ({issues.length})</summary>{issues.map((issue, index) => <p key={`${issue}-${index}`}>{issue}</p>)}</details> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, margin: "18px 0" }}>
        {[
          ["Settled revenue", rupees(settledRevenuePaise), "Paid SBI rows only"],
          ["Paid transactions", paidRows.length, "Gateway reference and paid time present"],
          ["Payment pending", pendingRows.length, "Not counted as revenue"],
          ["Review required", reviewRows.length, "Paid evidence awaiting verification closure"],
          ["Active entitlements", activeSubscriptions.length, "Business-profile projection"],
          ["Renewals ≤30 days", renewals.length, "Active plans with recorded expiry"],
        ].map(([label, value, helper]) => <article key={String(label)} style={panel}><small>{label}</small><strong style={{ display: "block", fontSize: 28 }}>{value}</strong><span>{helper}</span></article>)}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 12 }}>
        <article style={panel}>
          <h2>Canonical plan catalogue</h2>
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => <p key={key}><strong>{plan.label}</strong> · {rupees(plan.amountPaise)} / {plan.months} month<br />Storage key: {key}</p>)}
          <p>The catalogue is currently code-configured and must remain synchronized with the database plan constraint and subscription presentation.</p>
          <a href="/dashboard/subscription">Open Member Subscription</a>
        </article>

        <article style={panel}>
          <h2>SBI settlement pipeline</h2>
          <p><strong>Provider:</strong> {clean(SBI_GATEWAY_PROVIDER)}</p>
          <p><strong>Runtime readiness:</strong> {SBI_INTEGRATION_READY ? "Configured" : "Configuration pending"}</p>
          <p><strong>{failedRows.length}</strong> requests are failed, expired or cancelled.</p>
          <p>Only authenticated server confirmation through the restricted finalization authority may mark a request paid and activate an entitlement.</p>
          <p>No paid row is inferred from a pending request, profile plan, expected amount or payment link.</p>
        </article>

        <article style={panel}>
          <h2>Active plan distribution</h2>
          {[...planCounts.entries()].sort((a, b) => b[1] - a[1]).map(([plan, count]) => <p key={plan}><strong>{clean(plan)}</strong> · {count}</p>)}
          {!planCounts.size ? <p>No active entitlement in the bounded projection.</p> : null}
          <a href="/admin/users">Open Member Administration</a>
        </article>

        <article style={panel}>
          <h2>Renewal attention</h2>
          {renewals.slice(0, 15).map((row) => <p key={row.user_id}><strong>{row.business_name || row.user_id.slice(0, 8)}</strong><br />{clean(row.subscription_plan)} · expires {new Date(row.subscription_expires_at).toLocaleDateString("en-IN")}</p>)}
          {!renewals.length ? <p>No active subscription expiring within 30 days in the bounded projection.</p> : null}
        </article>

        <article style={panel}>
          <h2>Complimentary & legacy grants</h2>
          <p>Founder-approved complimentary access is stored separately in authentication metadata and projected to the business profile; it is not counted as settled revenue.</p>
          <p><strong>{cashAudit.data?.length || 0}</strong> legacy cash-audit rows are visible, but manual/cash paid activation is disabled and these rows are excluded from settled SBI revenue.</p>
          <a href="/admin/users">Review grants in Member Administration</a>
        </article>

        <article style={panel}>
          <h2>Revenue governance coverage</h2>
          <p><strong>Available:</strong> payment attempts, paid SBI evidence, projected entitlements, renewal dates and complimentary grants.</p>
          <p><strong>Not centrally implemented:</strong> GST tax invoices for platform subscriptions, refund ledger, coupon authority, payment reconciliation workbench, durable entitlement ledger and paid boost settlement.</p>
          <p>Razorpay has no active canonical adapter in this codebase. Vendor billing invoices are operational ERP documents and are not platform subscription revenue.</p>
          <a href="/refund-cancellation-policy">Open Refund & Cancellation Policy</a>
        </article>
      </section>
    </main>
  );
}
