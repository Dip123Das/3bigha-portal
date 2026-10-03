import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import { razorpayClient } from "@/lib/payments/razorpay";
import { reconcileOrder } from "@/lib/payments/reconcile-order";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const access = await requireMasterAdmin(req);
  if ("error" in access)
    return NextResponse.json(
      { error: "Master admin access required." },
      { status: access.status },
    );
  try {
    const body = await req.json();
    const { data: order, error } = await access.admin
      .from("commercial_orders")
      .select("*")
      .eq("id", String(body.purchaseId || ""))
      .maybeSingle();
    if (error || !order)
      return NextResponse.json(
        { error: "Purchase not found." },
        { status: 404 },
      );
    const gateway = await razorpayClient().orders.fetch(
      String(body.gatewayOrderId || order.gateway_order_id || ""),
    );
    if (
      gateway.receipt !== order.id ||
      Number(gateway.amount) !== Number(order.amount_paise) ||
      gateway.currency !== "INR" ||
      (order.gateway_order_id && order.gateway_order_id !== gateway.id)
    )
      return NextResponse.json(
        { error: "Provider order does not match the stored purchase." },
        { status: 409 },
      );
    const { error: saveError } = await access.admin
      .from("commercial_orders")
      .update({
        gateway_order_id: gateway.id,
        status: order.status === "created" ? "checkout_ready" : order.status,
      })
      .eq("id", order.id);
    if (saveError) throw saveError;
    order.gateway_order_id = gateway.id;
    if (gateway.status === "paid")
      return NextResponse.json({
        ok: true,
        status: await reconcileOrder(order),
      });
    return NextResponse.json({
      ok: true,
      status: "checkout_ready",
      message:
        "Provider order linked. The member can resume checkout without creating a second order.",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Reconciliation could not be completed. Check the merchant order and environment; no new charge was created.",
      },
      { status: 409 },
    );
  }
}
