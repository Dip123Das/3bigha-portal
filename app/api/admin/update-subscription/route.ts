import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

const PLANS = new Set(["free", "basic_vendor", "silver_vendor", "gold_vendor", "platinum_vendor", "premium_vendor", "hub_vendor"]);
const STATUSES = new Set(["free", "active", "expired", "cancelled"]);

export async function POST(req: Request) {
  const access = await requireMasterAdmin();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const form = await req.formData();
  const userId = String(form.get("user_id") || "");
  const plan = String(form.get("subscription_plan") || "free");
  const status = String(form.get("subscription_status") || "free");
  const expiresAt = String(form.get("subscription_expires_at") || "");
  const cashPayment = String(form.get("cash_payment") || "") === "1";
  const amount = Number(form.get("amount") || 0);
  const receiptReference = String(form.get("reference_no") || "").trim();
  const notes = String(form.get("notes") || "").trim();

  if (!userId || !PLANS.has(plan) || !STATUSES.has(status)) return NextResponse.json({ error: "Invalid subscription request" }, { status: 400 });
  if (cashPayment && (status !== "active" || plan === "free" || !receiptReference || !Number.isFinite(amount) || amount < 0)) {
    return NextResponse.json({ error: "Cash activation requires an active paid plan, amount and receipt/reference number." }, { status: 400 });
  }

  const subscriptionExpiresAt = expiresAt ? `${expiresAt}T23:59:59.000Z` : null;
  if (cashPayment) {
    const { data: audit, error: auditError } = await access.admin.from("admin_cash_subscription_audit").insert({
      user_id: userId,
      admin_user_id: access.user.id,
      subscription_plan: plan,
      amount,
      currency: "INR",
      receipt_reference: receiptReference,
      notes: notes || null,
      subscription_expires_at: subscriptionExpiresAt,
    }).select("id").single();
    if (auditError) return NextResponse.json({ error: auditError.message }, { status: 400 });

    const { error } = await access.admin.from("business_profiles").update({
      subscription_plan: plan,
      subscription_status: status,
      subscription_expires_at: subscriptionExpiresAt,
    }).eq("user_id", userId);
    if (error) {
      if (audit?.id) await access.admin.from("admin_cash_subscription_audit").delete().eq("id", audit.id);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await access.admin.from("payment_records").insert({
      user_id: userId, subscription_plan: plan, amount, currency: "INR",
      payment_method: "cash", payment_status: "paid", reference_no: receiptReference,
      notes: notes || null, subscription_expires_at: subscriptionExpiresAt,
    });
  } else {
    const { error } = await access.admin.from("business_profiles").update({
      subscription_plan: plan,
      subscription_status: status,
      subscription_expires_at: subscriptionExpiresAt,
    }).eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return new NextResponse(null, { status: 303, headers: { Location: "/admin/users" } });
}
