import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { SBI_INTEGRATION_READY, SUBSCRIPTION_PLANS } from "@/lib/payments/sbi";

export const dynamic = "force-dynamic";

export default async function SbiPaymentLinkPage({
  params,
}: {
  params: { token: string };
}) {
  const admin = getSupabaseAdmin();
  const { data: request } = await admin
    .from("subscription_payment_requests")
    .select("subscription_plan,amount_paise,currency,status,expires_at")
    .eq("share_token", params.token)
    .maybeSingle();

  if (!request) notFound();

  const expired = new Date(request.expires_at).getTime() <= Date.now();
  const plan =
    SUBSCRIPTION_PLANS[
      request.subscription_plan as keyof typeof SUBSCRIPTION_PLANS
    ];

  return (
    <main style={{ minHeight: "75vh", padding: "48px 20px", background: "#f8fafc" }}>
      <section style={{ maxWidth: 680, margin: "0 auto", padding: 28, border: "1px solid #dbeafe", borderRadius: 18, background: "white" }}>
        <div style={{ color: "#1d4ed8", fontWeight: 900 }}>3Bigha secure payment request</div>
        <h1>{plan?.label || "Subscription"} Growth Plan</h1>
        <p style={{ fontSize: 28, fontWeight: 900 }}>
          ₹{(Number(request.amount_paise) / 100).toLocaleString("en-IN")}
        </p>
        <p>This link is tied to the member’s 3Bigha subscription. A different person may make the online payment, but the subscription will be credited only to that member.</p>

        {expired ? (
          <div style={{ padding: 14, background: "#fef2f2", color: "#991b1b", borderRadius: 10, fontWeight: 800 }}>
            This payment link has expired. Ask the member to create a new link.
          </div>
        ) : SBI_INTEGRATION_READY ? (
          <div style={{ padding: 14, background: "#eff6ff", color: "#1e3a8a", borderRadius: 10 }}>
            SBI Payment Gateway checkout will appear here after the bank-issued integration has been configured.
          </div>
        ) : (
          <div style={{ padding: 14, background: "#fffbeb", color: "#92400e", borderRadius: 10, fontWeight: 800 }}>
            SBI Payment Gateway setup is pending. No payment has been collected, and this request cannot activate a subscription.
          </div>
        )}

        <p style={{ marginTop: 18, color: "#64748b", fontSize: 13 }}>
          Payment status: {String(request.status).replaceAll("_", " ")}. 3Bigha accepts subscription payments only through its SBI Payment Gateway.
        </p>
      </section>
    </main>
  );
}
