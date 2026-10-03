import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "crypto";
export const RAZORPAY_PROVIDER = "razorpay";
export function razorpayReady(): boolean {
  return Boolean(
    process.env.RAZORPAY_ENABLED === "true" &&
      Boolean(
        process.env.RAZORPAY_KEY_ID &&
          process.env.RAZORPAY_KEY_SECRET &&
          process.env.RAZORPAY_WEBHOOK_SECRET,
      ) &&
      ((process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") &&
        process.env.RAZORPAY_TEST_PAYMENTS_ENABLED === "true") ||
        (process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") &&
          process.env.RAZORPAY_LIVE_TAX_CONFIRMED === "true")),
  );
}
export function razorpayClient() {
  if (!razorpayReady())
    throw new Error(
      "Secure payments are being configured. Your current access remains available.",
    );
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}
export function validSignature(
  message: string,
  signature: unknown,
  secret: string,
) {
  if (!secret || typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature))
    return false;
  const expected = createHmac("sha256", secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export function matchesCapturedPayment(
  payment: {
    order_id?: string | null;
    amount: number | string;
    currency: string;
    status: string;
    id: string;
    amount_refunded?: number | string;
  },
  order: { gateway_order_id: string; amount_paise: number | string },
) {
  return (
    payment.order_id === order.gateway_order_id &&
    Number(payment.amount) === Number(order.amount_paise) &&
    payment.currency === "INR" &&
    (payment.status === "captured" ||
      (payment.status === "refunded" &&
        Number(payment.amount_refunded) === Number(payment.amount)))
  );
}
