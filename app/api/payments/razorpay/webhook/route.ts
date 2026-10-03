import { NextResponse } from "next/server";
import { validSignature, razorpayClient } from "@/lib/payments/razorpay";
import { reconcilePayment } from "@/lib/payments/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (
    !secret ||
    !validSignature(raw, req.headers.get("x-razorpay-signature"), secret)
  )
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  try {
    const event = JSON.parse(raw);
    const admin = getSupabaseAdmin();
    const eventId = req.headers.get("x-razorpay-event-id");
    if (!eventId)
      return NextResponse.json(
        { error: "Event reference required." },
        { status: 400 },
      );
    const { data: seen, error: seenError } = await admin
      .from("commercial_webhook_events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();
    if (seenError) throw seenError;
    if (seen) return NextResponse.json({ ok: true });
    if (["payment.captured", "order.paid"].includes(event.event)) {
      const paymentId = event.payload?.payment?.entity?.id;
      if (!paymentId) throw new Error("Missing payment");
      const payment = await razorpayClient().payments.fetch(paymentId);
      const { data: order, error } = await admin
        .from("commercial_orders")
        .select("*")
        .eq("gateway_order_id", payment.order_id)
        .maybeSingle();
      if (error) throw error;
      if (order) await reconcilePayment(order, paymentId);
    } else if (event.event === "refund.processed") {
      const refundId = event.payload?.refund?.entity?.id;
      const refund = await razorpayClient().refunds.fetch(refundId);
      if (refund.status !== "processed")
        throw new Error("Refund not processed");
      const payment = await razorpayClient().payments.fetch(refund.payment_id);
      const lookup = await admin
        .from("commercial_orders")
        .select("*")
        .eq("gateway_order_id", payment.order_id)
        .maybeSingle();
      if (lookup.error) throw lookup.error;
      // Refund may arrive before the capture event. Record provider-verified receipt without granting refunded access.
      if (lookup.data) await reconcilePayment(lookup.data, payment.id);
      const { error } = await admin.rpc("record_razorpay_refund", {
        p_payment_id: payment.id,
        p_refund_id: refund.id,
        p_refunded: Number(payment.amount_refunded || 0),
      });
      if (error) throw error;
    }
    const { error } = await admin
      .from("commercial_webhook_events")
      .upsert(
        { id: eventId, event_type: event.event },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Event processing pending." },
      { status: 503 },
    );
  }
}
