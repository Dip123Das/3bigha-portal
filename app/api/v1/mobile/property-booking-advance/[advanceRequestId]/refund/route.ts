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

type Refund = {
  id: string;
  receipt?: string | null;
  payment_id: string;
  amount?: number;
  currency: string;
  status: "pending" | "processed" | "failed";
};

type Transfer = {
  id?: string;
  recipient?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  amount_reversed?: number;
};

function failure(message: string, status: number, retryable = false) {
  return NextResponse.json(
    mobileFailure("PROPERTY_BOOKING_ADVANCE_FAILED", message, retryable),
    { status, headers: HEADERS },
  );
}

function transferList(order: { transfers?: unknown }) {
  const value = order.transfers;
  if (Array.isArray(value)) return value as Transfer[];
  if (value && typeof value === "object") {
    const items = (value as { items?: unknown }).items;
    return Array.isArray(items) ? items as Transfer[] : [];
  }
  return [];
}

export async function POST(
  request: Request,
  context: { params: { advanceRequestId: string } },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const advanceRequestId = String(context.params.advanceRequestId || "").trim();
    if (!UUID.test(advanceRequestId)) {
      return failure("Submit a valid property advance reference.", 400);
    }

    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    if (
      process.env.RAZORPAY_ENABLED !== "true" ||
      process.env.RAZORPAY_ROUTE_ENABLED !== "true" ||
      process.env.RAZORPAY_PROPERTY_ADVANCE_REFUNDS_ENABLED !== "true" ||
      !keyId ||
      !keySecret
    ) {
      return failure("Razorpay Route refunds are not configured.", 503, true);
    }

    const admin = getSupabaseAdmin();
    const { data: ledger, error: ledgerError } = await admin
      .from("property_unit_booking_advance_payments")
      .select("id,buyer_user_id,status,amount_paise,currency,gateway_mode,gateway_payment_id,gateway_refund_id,gateway_refund_receipt,gateway_order_id,gateway_transfer_id,seller_linked_account_id")
      .eq("advance_request_id", advanceRequestId)
      .eq("buyer_user_id", auth.user.id)
      .maybeSingle();

    if (ledgerError) return failure("The private payment record could not be loaded.", 503, true);
    if (!ledger) return failure("The property payment was not found.", 404);

    const activeMode = keyId.startsWith("rzp_test_")
      ? "test"
      : keyId.startsWith("rzp_live_")
        ? "live"
        : null;
    if (!activeMode || ledger.gateway_mode !== activeMode) {
      return failure(
        "The matching Razorpay environment for this payment is unavailable. The refund was not started.",
        503,
        true,
      );
    }

    const { data: requestData, error: requestError } = await admin.rpc(
      "begin_property_advance_full_refund",
      {
        target_payment_id: ledger.id,
        target_buyer_user_id: auth.user.id,
      },
    );

    if (requestError || !requestData) {
      const detail = String(requestError?.message || "");
      const conflict = detail.includes("PROPERTY_ADVANCE_REFUND_STATE_CONFLICT");
      const missing = detail.includes("PROPERTY_ADVANCE_PAYMENT_NOT_FOUND");
      return failure(
        missing
          ? "The property payment was not found."
          : conflict
            ? "This payment can no longer be cancelled automatically. Contact support for a protected review."
            : "The full refund could not be started.",
        missing ? 404 : conflict ? 409 : 503,
        !missing && !conflict,
      );
    }

    const refundReceipt = String(requestData.refundReceipt || "");
    const paymentId = String(requestData.gatewayPaymentId || "");
    const amountPaise = Number(requestData.amountPaise || ledger.amount_paise);

    if (requestData.status === "refunded") {
      return NextResponse.json(
        mobileSuccess({ status: "refunded", refundAmountPaise: amountPaise }),
        { status: 200, headers: HEADERS },
      );
    }

    if (!refundReceipt || !paymentId || amountPaise !== Number(ledger.amount_paise)) {
      await admin.rpc("mark_property_advance_refund_review", {
        target_payment_id: ledger.id,
        target_failure_code: "REFUND_REQUEST_BINDING_INVALID",
      });
      return failure("The refund request requires protected review.", 409);
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    let refund: Refund | null = null;

    if (requestData.shouldCreateRefund === true) {
      try {
        refund = (await razorpay.payments.refund(paymentId, {
          amount: amountPaise,
          reverse_all: true,
          receipt: refundReceipt,
        })) as Refund;
      } catch {
        /* The provider may have created the refund before the response was lost. */
        const existing = (await razorpay.payments.fetchMultipleRefund(
          paymentId,
        )) as { items?: Refund[] };
        refund = existing.items?.find((item) => item.receipt === refundReceipt) ?? null;
      }
    } else if (requestData.gatewayRefundId || ledger.gateway_refund_id) {
      refund = (await razorpay.refunds.fetch(
        String(requestData.gatewayRefundId || ledger.gateway_refund_id),
        {
        payment_id: paymentId,
        },
      )) as Refund;
    } else {
      const existing = (await razorpay.payments.fetchMultipleRefund(
        paymentId,
      )) as { items?: Refund[] };
      refund = existing.items?.find((item) => item.receipt === refundReceipt) ?? null;
    }

    if (!refund) {
      await admin.rpc("mark_property_advance_refund_review", {
        target_payment_id: ledger.id,
        target_failure_code: "REFUND_PROVIDER_OUTCOME_UNCERTAIN",
      });
      return failure(
        "Razorpay’s refund result could not be confirmed. Do not retry; the refund is under protected review.",
        503,
      );
    }

    if (
      refund.payment_id !== paymentId ||
      refund.receipt !== refundReceipt ||
      Number(refund.amount) !== amountPaise ||
      refund.currency !== ledger.currency
    ) {
      await admin.rpc("mark_property_advance_refund_review", {
        target_payment_id: ledger.id,
        target_failure_code: "REFUND_PROVIDER_DETAILS_MISMATCH",
      });
      return failure("Razorpay returned a refund that does not match this advance.", 409);
    }

    const { data: refundSaved, error: refundSaveError } = await admin.rpc(
      "save_property_advance_refund_reference",
      {
        target_payment_id: ledger.id,
        target_buyer_user_id: auth.user.id,
        target_refund_receipt: refundReceipt,
        target_gateway_refund_id: refund.id,
      },
    );
    if (refundSaveError || refundSaved !== true) {
      return failure("The Razorpay refund is pending payment reconciliation.", 503, true);
    }

    if (refund.status === "failed") {
      await admin.rpc("mark_property_advance_refund_review", {
        target_payment_id: ledger.id,
        target_failure_code: "REFUND_PROVIDER_FAILED",
      });
      return failure("Razorpay could not complete the full refund. Support review is required.", 409);
    }

    if (!ledger.gateway_order_id) {
      await admin.rpc("mark_property_advance_refund_review", {
        target_payment_id: ledger.id,
        target_failure_code: "REFUND_ORDER_REFERENCE_MISSING",
      });
      return failure("The refund is under protected review.", 409);
    }

    const routeOrder = await razorpay.orders.fetchTransferOrder(
      ledger.gateway_order_id,
    );
    const transfers = transferList(routeOrder);
    const transfer = ledger.gateway_transfer_id
      ? transfers.find((item) => item.id === ledger.gateway_transfer_id)
      : transfers.find(
          (item) =>
            item.recipient === ledger.seller_linked_account_id &&
            Number(item.amount) === amountPaise &&
            item.currency === ledger.currency,
        );
    const transferReversed = ledger.gateway_transfer_id
      ? Boolean(
          transfer &&
            (transfer.status === "reversed" ||
              Number(transfer.amount_reversed || 0) >= amountPaise),
        )
      : transfers.length === 0;

    const { data: completed, error: completeError } = await admin.rpc(
      "complete_property_advance_full_refund",
      {
        target_payment_id: ledger.id,
        target_gateway_refund_id: refund.id,
        target_refunded_amount_paise: Number(refund.amount),
        target_refund_status: refund.status,
        target_transfer_reversed: transferReversed,
      },
    );

    if (completeError || !completed) {
      return failure("The full refund result needs payment reconciliation.", 503, true);
    }

    const status = String(completed.status || "refund_pending");
    return NextResponse.json(
      mobileSuccess({
        status,
        refundAmountPaise: amountPaise,
        message:
          status === "refunded"
            ? "The full buyer refund is confirmed. The seller transfer was reversed or was not required."
            : "Razorpay is processing the full refund or seller transfer reversal.",
      }),
      { status: status === "refunded" ? 200 : 202, headers: HEADERS },
    );
  } catch (error) {
    if (error instanceof MobileAuthError) {
      const status = error.code === "CONFIGURATION_ERROR" ? 500 : 401;
      return NextResponse.json(
        mobileFailure(error.code, error.message),
        { status, headers: HEADERS },
      );
    }

    console.error("MOBILE_PROPERTY_ADVANCE_REFUND_FAILED");
    return failure("The full refund is pending provider reconciliation. Do not pay again.", 503, true);
  }
}
