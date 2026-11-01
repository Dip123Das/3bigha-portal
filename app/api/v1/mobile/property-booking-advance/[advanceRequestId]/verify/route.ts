import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";
import { NextResponse } from "next/server";

import { mobileFailure, mobileSuccess } from "@/lib/mobile/contracts/v1";
import {
  authenticateMobileRequest,
  MobileAuthError,
} from "@/lib/mobile/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

type Transfer = {
  id?: string;
  recipient?: string;
  amount?: number | string;
  currency?: string;
  settlement_status?: string | null;
};

function failure(message: string, status: number, retryable = false) {
  return NextResponse.json(
    mobileFailure("PROPERTY_BOOKING_ADVANCE_FAILED", message, retryable),
    { status, headers: HEADERS },
  );
}

function validCheckoutSignature(orderId: string, paymentId: string, signature: unknown, secret: string) {
  if (
    !secret ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();

  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export async function POST(
  request: Request,
  context: { params: { advanceRequestId: string } },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const advanceRequestId = String(context.params.advanceRequestId || "").trim();
    const body = await request.json().catch(() => null);
    const orderId = String(body?.razorpay_order_id ?? "").trim();
    const paymentId = String(body?.razorpay_payment_id ?? "").trim();
    const signature = body?.razorpay_signature;

    if (
      !UUID.test(advanceRequestId) ||
      !/^order_[A-Za-z0-9]+$/.test(orderId) ||
      !/^pay_[A-Za-z0-9]+$/.test(paymentId)
    ) {
      return failure("Submit a valid Razorpay payment confirmation.", 400);
    }

    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    if (
      process.env.RAZORPAY_ENABLED !== "true" ||
      process.env.RAZORPAY_ROUTE_ENABLED !== "true" ||
      !keyId ||
      !keySecret
    ) {
      return failure("Razorpay payment verification is not configured.", 503);
    }

    if (!validCheckoutSignature(orderId, paymentId, signature, keySecret)) {
      return failure("Razorpay payment verification failed.", 400);
    }

    const admin = getSupabaseAdmin();
    const { data: ledger, error: ledgerError } = await admin
      .from("property_unit_booking_advance_payments")
      .select("id,buyer_user_id,amount_paise,currency,gateway_mode,gateway_order_id,seller_linked_account_id,status,gateway_payment_id")
      .eq("advance_request_id", advanceRequestId)
      .eq("buyer_user_id", auth.user.id)
      .eq("gateway_order_id", orderId)
      .maybeSingle();

    if (ledgerError) {
      return failure("The private property payment could not be loaded.", 503, true);
    }
    if (!ledger) {
      return failure("The property payment order was not found for your account.", 404);
    }
    if (
      ledger.status === "paid_held" &&
      ledger.gateway_payment_id === paymentId
    ) {
      return NextResponse.json(
        mobileSuccess({ status: "paid_held", paymentId: ledger.id }),
        { status: 200, headers: HEADERS },
      );
    }
    if (ledger.status !== "payment_pending") {
      return failure("This property payment is already under reconciliation.", 409);
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.order_id !== orderId || payment.status !== "captured") {
      return failure(
        "Razorpay has not confirmed a captured payment for this order yet. Refresh payment status before trying again.",
        409,
        true,
      );
    }

    const routeOrder = await razorpay.orders.fetchTransferOrder(orderId);
    const rawTransfers = routeOrder.transfers;
    const transfers: Transfer[] = Array.isArray(rawTransfers)
      ? rawTransfers
      : rawTransfers && typeof rawTransfers === "object"
        ? (rawTransfers.items as Transfer[] | undefined) || []
        : [];
    const transfer = transfers.find(
      (candidate) =>
        candidate.recipient === ledger.seller_linked_account_id &&
        Number(candidate.amount) === Number(ledger.amount_paise) &&
        candidate.currency === ledger.currency,
    );
    const transferOnHold =
      routeOrder.id === orderId &&
      routeOrder.status === "paid" &&
      Number(routeOrder.amount_paid) === Number(ledger.amount_paise) &&
      routeOrder.currency === ledger.currency &&
      transfer?.settlement_status === "on_hold";

    const { data: recorded, error: recordError } = await admin.rpc(
      "record_property_advance_payment_capture",
      {
        target_payment_id: ledger.id,
        target_buyer_user_id: auth.user.id,
        target_gateway_order_id: orderId,
        target_gateway_payment_id: payment.id,
        target_gateway_transfer_id: transfer?.id || null,
        target_captured_amount_paise: Number(payment.amount),
        target_currency: String(payment.currency || ""),
        target_transfer_on_hold: transferOnHold,
      },
    );

    if (recordError || !recorded) {
      return failure(
        "Razorpay captured the payment, but its Route transfer could not be confirmed safely. The advance needs protected payment review.",
        503,
        true,
      );
    }

    const status = String(recorded.status || "review_required");
    return NextResponse.json(
      mobileSuccess({
        status,
        paymentId: ledger.id,
        message:
          status === "paid_held"
            ? "Payment verified. The seller transfer remains on hold pending deal completion."
            : "Payment captured, but the seller transfer hold could not be verified. The advance is under payment review.",
      }),
      { status: 200, headers: HEADERS },
    );
  } catch (error) {
    if (error instanceof MobileAuthError) {
      const status = error.code === "CONFIGURATION_ERROR" ? 500 : 401;
      return NextResponse.json(
        mobileFailure(error.code, error.message),
        { status, headers: HEADERS },
      );
    }

    console.error("MOBILE_PROPERTY_ADVANCE_VERIFY_FAILED");
    return failure(
      "Payment confirmation is pending provider reconciliation. Do not pay again.",
      409,
      true,
    );
  }
}
