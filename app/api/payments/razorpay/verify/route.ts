import { NextResponse } from "next/server";
import { paymentUser, reconcilePayment } from "@/lib/payments/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { validSignature } from "@/lib/payments/razorpay";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    const user = await paymentUser();
    if (!user)
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    const body = await req.json();
    const { data: order, error } = await getSupabaseAdmin()
      .from("commercial_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("gateway_order_id", String(body.razorpay_order_id || ""))
      .maybeSingle();
    if (error || !order)
      return NextResponse.json(
        { error: "Purchase not found." },
        { status: 404 },
      );
    if (
      !validSignature(
        `${order.gateway_order_id}|${body.razorpay_payment_id}`,
        body.razorpay_signature,
        process.env.RAZORPAY_KEY_SECRET || "",
      )
    )
      return NextResponse.json(
        { error: "Payment verification failed." },
        { status: 400 },
      );
    const status = await reconcilePayment(
      order,
      String(body.razorpay_payment_id),
    );
    return NextResponse.json({
      ok: true,
      status,
      message:
        status === "refunded"
          ? "This payment was refunded. Its purchased access is inactive."
          : status === "paid"
            ? "Payment verified. Your purchased access is ready."
            : "Payment received. Access awaits account verification or payment review.",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Payment confirmation is pending. Refresh your workspace; do not pay again.",
      },
      { status: 409 },
    );
  }
}
