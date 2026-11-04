import { randomUUID } from "crypto";
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

type PreparedPayment = {
  paymentId: string;
  status: string;
  gatewayOrderId: string | null;
  amountPaise: number;
  currency: "INR";
};

function failure(message: string, status: number, retryable = false) {
  return NextResponse.json(
    mobileFailure("PROPERTY_BOOKING_ADVANCE_FAILED", message, retryable),
    { status, headers: HEADERS },
  );
}

function gatewayConfiguration() {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const configured =
    process.env.RAZORPAY_ENABLED === "true" &&
    process.env.RAZORPAY_ROUTE_ENABLED === "true" &&
    process.env.RAZORPAY_PROPERTY_ADVANCE_PAYMENTS_ENABLED === "true" &&
    process.env.RAZORPAY_PROPERTY_ADVANCE_REFUNDS_ENABLED === "true" &&
    process.env.RAZORPAY_PROPERTY_ADVANCE_SETTLEMENTS_ENABLED === "true" &&
    Boolean(keyId && keySecret && process.env.RAZORPAY_WEBHOOK_SECRET);

  if (!configured) return null;

  if (keyId.startsWith("rzp_test_")) {
    if (process.env.RAZORPAY_TEST_PAYMENTS_ENABLED !== "true") return null;
    return { keyId, keySecret, mode: "test" as const };
  }

  if (
    keyId.startsWith("rzp_live_") &&
    process.env.RAZORPAY_LIVE_TAX_CONFIRMED === "true"
  ) {
    return { keyId, keySecret, mode: "live" as const };
  }

  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ advanceRequestId: string }> },
) {
  let paymentId: string | null = null;
  let attemptId: string | null = null;
  let buyerUserId: string | null = null;

  try {
    const auth = await authenticateMobileRequest(request);
    buyerUserId = auth.user.id;

    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return failure("Invalid request origin.", 403);
    }

    const { advanceRequestId: rawAdvanceRequestId } = await context.params;
    const advanceRequestId = String(rawAdvanceRequestId || "").trim();
    const body = await request.json().catch(() => null);
    const idempotencyKey = String(body?.idempotencyKey ?? "").trim();

    if (!UUID.test(advanceRequestId) || !UUID.test(idempotencyKey)) {
      return failure("Submit a valid advance and payment request reference.", 400);
    }

    const gateway = gatewayConfiguration();
    if (!gateway) {
      return failure(
        "Property checkout is not enabled. Razorpay Route refunds and settlement-release controls must be active first.",
        503,
      );
    }

    const admin = getSupabaseAdmin();
    const { data: preparedData, error: prepareError } = await admin.rpc(
      "prepare_property_unit_booking_advance_payment",
      {
        target_buyer_user_id: auth.user.id,
        target_advance_request_id: advanceRequestId,
        target_idempotency_key: idempotencyKey,
        target_gateway_mode: gateway.mode,
      },
    );

    if (prepareError || !preparedData) {
      const detail = String(prepareError?.message || "");
      const conflicts: Array<[string, string]> = [
        ["PAYMENT_ACCESS_FORBIDDEN", "This advance does not belong to your account."],
        ["REQUEST_NOT_FOUND", "The property advance was not found."],
        ["APPLICATION_NOT_ACCEPTED", "The accepted booking window has ended."],
        ["BUYER_CONSENT_REQUIRED", "Confirm the advance terms before checkout."],
        ["UNIT_NOT_RESERVED", "The property unit is no longer reserved."],
        ["SELLER_ROUTE_NOT_READY", "The seller Route account is not ready for property payments."],
        ["PAYMENT_ALREADY_PREPARED", "A payment request already exists for this advance."],
      ];
      const match = conflicts.find(([needle]) => detail.includes(needle));
      return failure(
        match?.[1] || "The property payment request could not be prepared.",
        match ? 409 : 503,
        !match,
      );
    }

    const prepared = preparedData as PreparedPayment;
    paymentId = prepared.paymentId;

    const { data: ledger, error: ledgerError } = await admin
      .from("property_unit_booking_advance_payments")
      .select("id,buyer_user_id,status,amount_paise,currency,gateway_mode,gateway_order_id,seller_linked_account_id,order_creation_attempt")
      .eq("id", prepared.paymentId)
      .eq("buyer_user_id", auth.user.id)
      .maybeSingle();

    if (ledgerError || !ledger) {
      return failure("The private property payment record could not be loaded.", 503, true);
    }

    if (
      ledger.status === "payment_pending" &&
      ledger.gateway_order_id
    ) {
      return NextResponse.json(
        mobileSuccess({
          paymentId: ledger.id,
          orderId: ledger.gateway_order_id,
          amountPaise: Number(ledger.amount_paise),
          currency: "INR",
          keyId: gateway.keyId,
          status: ledger.status,
        }),
        { status: 200, headers: HEADERS },
      );
    }

    if (ledger.status !== "order_preparing" || ledger.gateway_order_id) {
      return failure(
        "This property advance is no longer awaiting checkout. Refresh its payment status before continuing.",
        409,
      );
    }

    attemptId = randomUUID();
    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_property_advance_payment_order",
      {
        target_payment_id: ledger.id,
        target_buyer_user_id: auth.user.id,
        target_attempt_id: attemptId,
      },
    );

    if (claimError || claimed !== true) {
      return failure(
        "This property order is already being prepared or needs payment reconciliation. Do not retry with a new request.",
        409,
      );
    }

    const gatewayOrder = await new Razorpay({
      key_id: gateway.keyId,
      key_secret: gateway.keySecret,
    }).orders.create({
      amount: Number(ledger.amount_paise),
      currency: "INR",
      receipt: ledger.id,
      notes: {
        property_advance_payment_id: ledger.id,
        property_advance_request_id: advanceRequestId,
      },
      transfers: [
        {
          account: ledger.seller_linked_account_id,
          amount: Number(ledger.amount_paise),
          currency: "INR",
          on_hold: true,
          notes: { property_advance_payment_id: ledger.id },
        },
      ],
    });

    const { data: saved, error: saveError } = await admin.rpc(
      "save_property_advance_payment_order",
      {
        target_payment_id: ledger.id,
        target_buyer_user_id: auth.user.id,
        target_attempt_id: attemptId,
        target_gateway_order_id: gatewayOrder.id,
      },
    );

    if (saveError || !saved) {
      await admin.rpc("mark_property_advance_payment_order_review", {
        target_payment_id: ledger.id,
        target_buyer_user_id: auth.user.id,
        target_attempt_id: attemptId,
      });
      attemptId = null;
      return failure(
        "Razorpay created an order but it could not be safely recorded. Payment is not ready; contact support before retrying.",
        503,
      );
    }

    attemptId = null;
    return NextResponse.json(
      mobileSuccess({
        paymentId: ledger.id,
        orderId: gatewayOrder.id,
        amountPaise: Number(ledger.amount_paise),
        currency: "INR",
        keyId: gateway.keyId,
        status: "payment_pending",
      }),
      { status: 201, headers: HEADERS },
    );
  } catch (error) {
    if (attemptId && paymentId && buyerUserId) {
      await getSupabaseAdmin().rpc(
        "mark_property_advance_payment_order_review",
        {
          target_payment_id: paymentId,
          target_buyer_user_id: buyerUserId,
          target_attempt_id: attemptId,
        },
      );
    }

    if (error instanceof MobileAuthError) {
      const status = error.code === "CONFIGURATION_ERROR" ? 500 : 401;
      return NextResponse.json(
        mobileFailure(error.code, error.message),
        { status, headers: HEADERS },
      );
    }

    console.error("MOBILE_PROPERTY_ADVANCE_ORDER_FAILED");
    return failure(
      "Razorpay order preparation failed or needs reconciliation. Do not start another payment request.",
      503,
      true,
    );
  }
}
