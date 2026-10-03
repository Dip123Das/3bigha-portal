import { razorpayClient, matchesCapturedPayment } from "./razorpay";
import { reconcilePayment } from "./server";
export async function reconcileOrder(order: any) {
  if (order.gateway_payment_id)
    return reconcilePayment(order, order.gateway_payment_id);
  if (!order.gateway_order_id)
    throw new Error("Payment order preparation needs support review.");
  const payments = await razorpayClient().orders.fetchPayments(
    order.gateway_order_id,
  );
  const captured = payments.items.find((p) => matchesCapturedPayment(p, order));
  if (!captured)
    throw new Error(
      "No captured payment found. Your current access is unchanged.",
    );
  return reconcilePayment(order, captured.id);
}
