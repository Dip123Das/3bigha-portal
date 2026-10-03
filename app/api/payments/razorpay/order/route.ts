import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { paymentUser } from "@/lib/payments/server";
import { razorpayClient, razorpayReady } from "@/lib/payments/razorpay";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    const user = await paymentUser();
    if (!user)
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    if (
      req.headers.get("origin") &&
      req.headers.get("origin") !== new URL(req.url).origin
    )
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    if (!razorpayReady())
      return NextResponse.json(
        { error: "Secure payments are being configured." },
        { status: 503 },
      );
    if (["3bigha.com","www.3bigha.com"].includes(new URL(req.url).hostname) && process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) return NextResponse.json({error:"Test checkout is permitted only on staging."},{status:503});
    const body = await req.json();
    const key = String(body.idempotencyKey || "");
    const resource = body.resourceId ? String(body.resourceId) : null;
    if (!UUID.test(key) || (resource && !UUID.test(resource)))
      return NextResponse.json(
        { error: "Invalid purchase reference." },
        { status: 400 },
      );
    const admin = getSupabaseAdmin();
    const { data: controls, error: controlError } = await admin
      .from("commercial_controls")
      .select("enforcement_enabled")
      .eq("id", true)
      .single();
    if (
      controlError ||
      (!process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") &&
        controls?.enforcement_enabled !== true)
    )
      return NextResponse.json(
        { error: "Live billing rollout is not enabled." },
        { status: 503 },
      );
    const { data: prepared, error } = await admin.rpc(
      "prepare_razorpay_purchase",
      {
        p_user: user.id,
        p_product: String(body.product || body.plan || ""),
        p_resource: resource,
        p_key: key,
        p_mode: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")
          ? "test"
          : "live",
      },
    );
    if (error)
      return NextResponse.json({ error: error.message }, { status: 409 });
    const order = prepared as any;
    if (order.status === "paid" || order.status === "review_required")
      return NextResponse.json(
        { error: "This purchase is already paid. Refresh your workspace." },
        { status: 409 },
      );
    if (!order.gateway_order_id) {
      // One request owns the gateway call. A lost response is reconciled manually, never blindly charged twice.
      const attempt = randomUUID();
      const { data: claimed, error: claimError } = await admin
        .from("commercial_orders")
        .update({ create_attempt: attempt })
        .eq("id", order.id)
        .is("create_attempt", null)
        .select("id")
        .maybeSingle();
      if (claimError || !claimed)
        return NextResponse.json(
          {
            error:
              "This purchase is being prepared. Retry the same purchase shortly; contact support if it remains pending.",
          },
          { status: 409 },
        );
      const gatewayOrder = await razorpayClient().orders.create({
        amount: order.amount_paise,
        currency: "INR",
        receipt: order.id,
        notes: { purchase_id: order.id },
      });
      const { error: saveError } = await admin
        .from("commercial_orders")
        .update({ gateway_order_id: gatewayOrder.id, status: "checkout_ready" })
        .eq("id", order.id)
        .eq("create_attempt", attempt);
      if (saveError)
        throw new Error(
          "Payment preparation needs reconciliation. Contact support before starting another purchase.",
        );
      order.gateway_order_id = gatewayOrder.id;
    }
    return NextResponse.json({
      ok: true,
      purchaseId: order.id,
      orderId: order.gateway_order_id,
      amount: order.amount_paise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      label: order.label,
      email: user.email,
    });
  } catch (e) {
    console.error(
      "[razorpay-order]",
      e instanceof Error ? e.message : "Failed",
    );
    return NextResponse.json(
      {
        error:
          "Could not prepare payment. Retry the same purchase or contact support.",
      },
      { status: 503 },
    );
  }
}
