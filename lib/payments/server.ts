import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { razorpayClient, matchesCapturedPayment } from "./razorpay";
export async function paymentUser() {
  const session = getSupabaseServerClient(await cookies());
  const {
    data: { user },
  } = await session.auth.getUser();
  return user;
}
export async function reconcilePayment(order: any, paymentId: string) {
  const payment = await razorpayClient().payments.fetch(paymentId);
  if (!matchesCapturedPayment(payment, order))
    throw new Error("Payment is not captured or does not match this order.");
  const { data, error } = await getSupabaseAdmin().rpc(
    "finalize_razorpay_purchase",
    {
      p_order_id: order.id,
      p_payment_id: payment.id,
      p_amount: Number(payment.amount),
      p_currency: payment.currency,
      p_refunded: Number(payment.amount_refunded || 0),
    },
  );
  if (error) throw new Error(error.message);
  return data as string;
}
