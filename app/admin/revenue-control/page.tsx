import AdminRazorpayReconcileForm from "@/components/payments/AdminRazorpayReconcileForm";
import { redirect } from "next/navigation";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import { COMMERCIAL_PRODUCTS, priceLabel } from "@/lib/payments/catalogue";
import { razorpayReady } from "@/lib/payments/razorpay";
export const dynamic = "force-dynamic";
export default async function RevenueControl() {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/revenue-control");
    return <main>Access denied</main>;
  }
  const [orders, grants, legacy] = await Promise.all([
    access.admin
      .from("commercial_orders")
      .select(
        "id,user_id,product,label,amount_paise,gateway_mode,status,refunded_paise,paid_at,gateway_payment_id,created_at,create_attempt,gateway_order_id",
      )
      .order("created_at", { ascending: false })
      .limit(2000),
    access.admin
      .from("commercial_entitlements")
      .select("id,user_id,product,kind,resource_id,ends_at,revoked_at,source")
      .order("created_at", { ascending: false })
      .limit(2000),
    access.admin
      .from("subscription_payment_requests")
      .select("id,amount_paise,status,gateway_transaction_id,paid_at")
      .eq("status", "paid")
      .limit(2000),
  ]);
  const rows = orders.data || [];
  const captured = rows.filter(
    (o) => o.gateway_mode === "live" && o.paid_at && o.gateway_payment_id,
  );
  const total = captured.reduce((sum, o) => sum + Number(o.amount_paise), 0);
  const refunded = captured.reduce(
    (sum, o) => sum + Number(o.refunded_paise),
    0,
  );
  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "auto" }}>
      <a href="/admin/dashboard">← Admin Command Center</a>
      <h1>Payments, subscriptions and optional services</h1>
      <p>
        Razorpay checkout:{" "}
        {razorpayReady() ? "Configured" : "Configuration pending"}. Monthly
        renewal is manual.
      </p>
      {[orders, grants, legacy]
        .filter((r) => r.error)
        .map((r, i) => (
          <p key={i} role="alert">
            Partial data: {r.error?.message}
          </p>
        ))}
      <p>
        Captured Razorpay receipts in this bounded view: ₹{total / 100}.
        Refunded: ₹{refunded / 100}. Net captured: ₹{(total - refunded) / 100}.
        These are gross customer totals, not confirmed bank settlements or
        tax-exclusive revenue.
      </p>
      <h2>Canonical catalogue</h2>
      {Object.entries(COMMERCIAL_PRODUCTS).map(([key, p]) => (
        <p key={key}>
          {p.label}: {priceLabel(p.amountPaise)} · {key}
        </p>
      ))}
      <h2>Reconcile an existing provider order</h2>
      <AdminRazorpayReconcileForm />
      <h2>Payment attempts and captured receipts</h2>
      <p>
        Counts are bounded to 2,000 recent records. Pending requests and
        complimentary grants are excluded from captured receipts. Unknown
        gateway-order creation outcomes require reconciliation using the
        purchase UUID as the Razorpay receipt reference before restarting a
        purchase.
      </p>
      {rows.map((o) => (
        <p key={o.id}>
          <strong>
            {o.label} · ₹{o.amount_paise / 100}
          </strong>{" "}
          · {o.gateway_mode} · {o.status} · refunded ₹{o.refunded_paise / 100}
          <br />
          Purchase: {o.id} · member: {o.user_id} · provider payment:{" "}
          {o.gateway_payment_id || "pending"}
          {o.create_attempt && !o.gateway_order_id
            ? " · ORDER CREATION RECONCILIATION REQUIRED"
            : ""}
        </p>
      ))}
      <h2>Durable access records</h2>
      {grants.data?.map((e) => (
        <p key={e.id}>
          {e.product} · {e.source} · {e.user_id} ·{" "}
          {e.revoked_at
            ? "revoked"
            : e.ends_at
              ? `paid through ${e.ends_at}`
              : "no expiry"}
          {e.resource_id ? ` · project ${e.resource_id}` : ""}
        </p>
      ))}
      <h2>Historical SBI receipts</h2>
      <p>
        {legacy.data?.filter((o) => o.gateway_transaction_id && o.paid_at)
          .length || 0}{" "}
        historical verified paid records remain separate. Historical transaction
        amounts are preserved.
      </p>
      <p>
        Refunds are initiated in the authenticated Razorpay merchant dashboard.
        Verified refund webhooks update receipt totals and revoke fully refunded
        purchases. Tax invoices and bank settlements require the configured
        merchant accounting workflow; this screen does not infer either from a
        captured receipt.
      </p>
      <a href="/refund-cancellation-policy">Refund policy</a>
    </main>
  );
}
