import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Transfer = {
  id?: string;
  recipient?: string;
  amount?: number | string;
  currency?: string;
  settlement_status?: string | null;
  status?: string;
  amount_reversed?: number;
  recipient_settlement_id?: string | null;
};

const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function validWebhookSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature) || !secret) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

function response(message: string, status: number) {
  return NextResponse.json({ ok: status < 400, message }, { status, headers: HEADERS });
}

function transferList(order: { transfers?: unknown }): Transfer[] {
  const raw = order.transfers;
  if (Array.isArray(raw)) return raw as Transfer[];
  if (raw && typeof raw === "object") {
    return ((raw as { items?: Transfer[] }).items || []);
  }
  return [];
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

  if (
    !validWebhookSignature(
      rawBody,
      request.headers.get("x-razorpay-signature"),
      webhookSecret,
    )
  ) {
    return response("Invalid Razorpay webhook signature.", 400);
  }

  const gatewayEventId = String(
    request.headers.get("x-razorpay-event-id") || "",
  ).trim();
  if (!gatewayEventId) {
    return response("Razorpay event reference is required.", 400);
  }

  let eventType = "unknown";
  let claimCompleted = false;

  try {
    const event = JSON.parse(rawBody);
    eventType = String(event?.event || "unknown").trim().slice(0, 120);
    const admin = getSupabaseAdmin();
    const { data: claim, error: claimError } = await admin.rpc(
      "claim_property_advance_webhook_event",
      {
        target_gateway_event_id: gatewayEventId,
        target_event_type: eventType,
      },
    );

    if (claimError) throw claimError;
    if (claim === "duplicate") {
      return response("Razorpay event already received.", 200);
    }
    if (claim === "in_progress") {
      return response("Razorpay event is still processing.", 503);
    }
    if (claim !== "process") throw new Error("WEBHOOK_CLAIM_INVALID");
    claimCompleted = true;

    if (!["payment.captured", "order.paid", "refund.processed", "refund.failed", "settlement.processed"].includes(eventType)) {
      const { error: finishError } = await admin.rpc(
        "finish_property_advance_webhook_event",
        {
          target_gateway_event_id: gatewayEventId,
          target_processed: true,
          target_error_code: null,
        },
      );
      if (finishError) throw finishError;
      claimCompleted = false;
      return response("Event accepted.", 200);
    }

    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    if (!keyId || !keySecret) throw new Error("RAZORPAY_API_UNAVAILABLE");

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    if (eventType === "settlement.processed") {
      const settlementId = String(
        event?.payload?.settlement?.entity?.id || "",
      ).trim();
      if (!settlementId) throw new Error("WEBHOOK_SETTLEMENT_MISSING");

      const transfers = await razorpay.transfers.all({
        recipient_settlement_id: settlementId,
      });
      for (const candidate of transfers.items || []) {
        const transferId = String(candidate.id || "").trim();
        if (!transferId) continue;
        const { data: settlementLedger, error: settlementLedgerError } =
          await admin
            .from("property_unit_booking_advance_payments")
            .select("id,gateway_transfer_id,seller_linked_account_id,amount_paise,currency,status")
            .eq("gateway_transfer_id", transferId)
            .maybeSingle();

        if (settlementLedgerError) throw settlementLedgerError;
        if (!settlementLedger) continue;

        const transfer = (await razorpay.transfers.fetch(transferId)) as Transfer;
        if (
          transfer.id !== settlementLedger.gateway_transfer_id ||
          transfer.recipient !== settlementLedger.seller_linked_account_id ||
          Number(transfer.amount) !== Number(settlementLedger.amount_paise) ||
          transfer.currency !== settlementLedger.currency ||
          transfer.recipient_settlement_id !== settlementId ||
          transfer.settlement_status !== "settled"
        ) {
          throw new Error("WEBHOOK_SETTLEMENT_DETAILS_MISMATCH");
        }

        const { error: settledError } = await admin.rpc(
          "record_property_advance_settled",
          {
            target_payment_id: settlementLedger.id,
            target_gateway_transfer_id: transfer.id,
            target_recipient_settlement_id: settlementId,
            target_settlement_status: transfer.settlement_status,
          },
        );
        if (settledError) throw settledError;
      }

      const { error: finishError } = await admin.rpc(
        "finish_property_advance_webhook_event",
        {
          target_gateway_event_id: gatewayEventId,
          target_processed: true,
          target_error_code: null,
        },
      );
      if (finishError) throw finishError;
      claimCompleted = false;
      return response("Seller settlement event recorded.", 200);
    }

    if (["refund.processed", "refund.failed"].includes(eventType)) {
      const refundId = String(event?.payload?.refund?.entity?.id || "").trim();
      if (!refundId) throw new Error("WEBHOOK_REFUND_MISSING");

      const refund = await razorpay.refunds.fetch(refundId);
      const refundPaymentId = String(refund.payment_id || "").trim();
      const refundPayment = await razorpay.payments.fetch(refundPaymentId);
      const { data: refundLedger, error: refundLedgerError } = await admin
        .from("property_unit_booking_advance_payments")
        .select("id,buyer_user_id,status,amount_paise,currency,gateway_payment_id,gateway_order_id,gateway_transfer_id,gateway_refund_id,gateway_refund_receipt,seller_linked_account_id")
        .eq("gateway_payment_id", refundPaymentId)
        .maybeSingle();

      if (refundLedgerError) throw refundLedgerError;
      if (!refundLedger) {
        const { error: finishError } = await admin.rpc(
          "finish_property_advance_webhook_event",
          {
            target_gateway_event_id: gatewayEventId,
            target_processed: true,
            target_error_code: null,
          },
        );
        if (finishError) throw finishError;
        claimCompleted = false;
        return response("Event accepted.", 200);
      }

      if (
        refundLedger.status === "refunded" &&
        refundLedger.gateway_refund_id === refund.id
      ) {
        const { error: finishError } = await admin.rpc(
          "finish_property_advance_webhook_event",
          {
            target_gateway_event_id: gatewayEventId,
            target_processed: true,
            target_error_code: null,
          },
        );
        if (finishError) throw finishError;
        claimCompleted = false;
        return response("Event accepted.", 200);
      }

      if (
        !refund.receipt ||
        !refundLedger.gateway_refund_receipt ||
        refund.receipt !== refundLedger.gateway_refund_receipt ||
        refund.currency !== refundLedger.currency ||
        refundPayment.order_id !== refundLedger.gateway_order_id
      ) {
        await admin.rpc("mark_property_advance_refund_review", {
          target_payment_id: refundLedger.id,
          target_failure_code: "REFUND_WEBHOOK_DETAILS_MISMATCH",
        });
        throw new Error("REFUND_WEBHOOK_DETAILS_MISMATCH");
      }

      const { data: refundSaved, error: refundSaveError } = await admin.rpc(
        "save_property_advance_refund_reference",
        {
          target_payment_id: refundLedger.id,
          target_buyer_user_id: refundLedger.buyer_user_id,
          target_refund_receipt: refund.receipt,
          target_gateway_refund_id: refund.id,
        },
      );
      if (refundSaveError || refundSaved !== true) {
        throw new Error("REFUND_WEBHOOK_RECORD_FAILED");
      }

      if (
        Number(refund.amount) !== Number(refundLedger.amount_paise)
      ) {
        await admin.rpc("mark_property_advance_refund_review", {
          target_payment_id: refundLedger.id,
          target_failure_code: "REFUND_WEBHOOK_AMOUNT_MISMATCH",
        });
      } else if (
        (eventType === "refund.processed" && refund.status !== "processed") ||
        (eventType === "refund.failed" && refund.status !== "failed")
      ) {
        throw new Error("REFUND_WEBHOOK_STATUS_NOT_FINAL");
      } else if (eventType === "refund.failed" || refund.status === "failed") {
        await admin.rpc("mark_property_advance_refund_review", {
          target_payment_id: refundLedger.id,
          target_failure_code: "REFUND_PROVIDER_FAILED",
        });
      } else if (refund.status === "processed") {
        if (!refundLedger.gateway_order_id) {
          await admin.rpc("mark_property_advance_refund_review", {
            target_payment_id: refundLedger.id,
            target_failure_code: "REFUND_ORDER_REFERENCE_MISSING",
          });
          throw new Error("REFUND_ORDER_REFERENCE_MISSING");
        }
        const routeOrder = await razorpay.orders.fetchTransferOrder(
          refundLedger.gateway_order_id,
        );
        const transfers = transferList(routeOrder);
        const transfer = refundLedger.gateway_transfer_id
          ? transfers.find((item) => item.id === refundLedger.gateway_transfer_id)
          : transfers.find(
              (item) =>
                item.recipient === refundLedger.seller_linked_account_id &&
                Number(item.amount) === Number(refundLedger.amount_paise) &&
                item.currency === refundLedger.currency,
            );
        const transferReversed = refundLedger.gateway_transfer_id
          ? Boolean(
              transfer &&
                (transfer.status === "reversed" ||
                  Number(transfer.amount_reversed || 0) >= Number(refundLedger.amount_paise)),
            )
          : transfers.length === 0;

        const { error: completeError } = await admin.rpc(
          "complete_property_advance_full_refund",
          {
            target_payment_id: refundLedger.id,
            target_gateway_refund_id: refund.id,
            target_refunded_amount_paise: Number(refund.amount),
            target_refund_status: refund.status,
            target_transfer_reversed: transferReversed,
          },
        );
        if (completeError) throw completeError;
      }

      const { error: finishError } = await admin.rpc(
        "finish_property_advance_webhook_event",
        {
          target_gateway_event_id: gatewayEventId,
          target_processed: true,
          target_error_code: null,
        },
      );
      if (finishError) throw finishError;
      claimCompleted = false;
      return response(
        refundPayment.status === "captured"
          ? "Refund event recorded."
          : "Refund event recorded for reconciliation.",
        200,
      );
    }

    let paymentId = String(event?.payload?.payment?.entity?.id || "").trim();
    const payloadOrderId = String(event?.payload?.order?.entity?.id || "").trim();

    if (!paymentId && payloadOrderId) {
      const paymentList = await razorpay.orders.fetchPayments(payloadOrderId);
      paymentId = String(
        paymentList.items.find((item) => item.status === "captured")?.id || "",
      ).trim();
    }

    if (!paymentId) throw new Error("WEBHOOK_PAYMENT_MISSING");

    const payment = await razorpay.payments.fetch(paymentId);
    const gatewayOrderId = String(payment.order_id || "").trim();
    if (!gatewayOrderId || payment.status !== "captured") {
      throw new Error("WEBHOOK_PAYMENT_NOT_CAPTURED");
    }

    const { data: ledger, error: ledgerError } = await admin
      .from("property_unit_booking_advance_payments")
      .select("id,buyer_user_id,amount_paise,currency,gateway_order_id,gateway_transfer_id,seller_linked_account_id,status,gateway_payment_id")
      .eq("gateway_order_id", gatewayOrderId)
      .maybeSingle();

    if (ledgerError) throw ledgerError;
    if (!ledger) {
      const { error: finishError } = await admin.rpc(
        "finish_property_advance_webhook_event",
        {
          target_gateway_event_id: gatewayEventId,
          target_processed: true,
          target_error_code: null,
        },
      );
      if (finishError) throw finishError;
      claimCompleted = false;
      return response("Event accepted.", 200);
    }

    const routeOrder = await razorpay.orders.fetchTransferOrder(gatewayOrderId);
    const transfers = transferList(routeOrder);
    const transfer = transfers.find(
      (candidate) =>
        candidate.recipient === ledger.seller_linked_account_id &&
        Number(candidate.amount) === Number(ledger.amount_paise) &&
        candidate.currency === ledger.currency,
    );
    const transferOnHold =
      routeOrder.id === gatewayOrderId &&
      routeOrder.status === "paid" &&
      Number(routeOrder.amount_paid) === Number(ledger.amount_paise) &&
      routeOrder.currency === ledger.currency &&
      transfer?.settlement_status === "on_hold";

    const { data: recorded, error: recordError } = await admin.rpc(
      "record_property_advance_payment_capture",
      {
        target_payment_id: ledger.id,
        target_buyer_user_id: ledger.buyer_user_id,
        target_gateway_order_id: gatewayOrderId,
        target_gateway_payment_id: payment.id,
        target_gateway_transfer_id: transfer?.id || null,
        target_captured_amount_paise: Number(payment.amount),
        target_currency: String(payment.currency || ""),
        target_transfer_on_hold: transferOnHold,
      },
    );

    if (recordError || !recorded) throw new Error("CAPTURE_RECORD_FAILED");

    const { error: finishError } = await admin.rpc(
      "finish_property_advance_webhook_event",
      {
        target_gateway_event_id: gatewayEventId,
        target_processed: true,
        target_error_code: null,
      },
    );
    if (finishError) throw finishError;
    claimCompleted = false;

    return response(
      recorded.status === "paid_held"
        ? "Payment capture and held seller transfer recorded."
        : "Payment capture recorded for protected review.",
      200,
    );
  } catch {
    if (claimCompleted) {
      await getSupabaseAdmin().rpc(
        "finish_property_advance_webhook_event",
        {
          target_gateway_event_id: gatewayEventId,
          target_processed: false,
          target_error_code: "PROPERTY_ADVANCE_WEBHOOK_RETRYABLE",
        },
      );
    }

    console.error("RAZORPAY_PROPERTY_ADVANCE_WEBHOOK_FAILED");
    return response("Property payment event processing is pending.", 503);
  }
}
