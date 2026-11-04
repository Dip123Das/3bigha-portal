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
  status?: string;
  settlement_status?: string | null;
  recipient_settlement_id?: string | null;
};

function failure(message: string, status: number, retryable = false) {
  return NextResponse.json(
    mobileFailure("PROPERTY_BOOKING_ADVANCE_FAILED", message, retryable),
    { status, headers: HEADERS },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ advanceRequestId: string }> },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const { advanceRequestId: rawAdvanceRequestId } = await context.params;
    const advanceRequestId = String(rawAdvanceRequestId || "").trim();
    if (!UUID.test(advanceRequestId)) {
      return failure("Submit a valid property advance reference.", 400);
    }

    const admin = getSupabaseAdmin();
    const { data: ledger, error: ledgerError } = await admin
      .from("property_unit_booking_advance_payments")
      .select("id,buyer_user_id,owner_user_id,status,amount_paise,currency,gateway_mode,gateway_transfer_id,seller_linked_account_id")
      .eq("advance_request_id", advanceRequestId)
      .maybeSingle();

    if (ledgerError) return failure("The private payment record could not be loaded.", 503, true);
    if (!ledger) return failure("The property payment was not found.", 404);

    const { data: confirmation, error: confirmError } = await admin.rpc(
      "confirm_property_advance_deal_completion",
      {
        target_payment_id: ledger.id,
        target_actor_user_id: auth.user.id,
      },
    );

    if (confirmError || !confirmation) {
      const detail = String(confirmError?.message || "");
      const forbidden = detail.includes("PROPERTY_ADVANCE_COMPLETION_ACCESS_FORBIDDEN");
      const conflict = detail.includes("PROPERTY_ADVANCE_COMPLETION_STATE_CONFLICT");
      return failure(
        forbidden
          ? "Only the buyer and property seller can confirm deal completion."
          : conflict
            ? "This payment is not eligible for completion confirmation or settlement release."
            : "The completion confirmation could not be recorded.",
        forbidden ? 403 : conflict ? 409 : 503,
        !forbidden && !conflict,
      );
    }

    if (confirmation.readyToRelease !== true) {
      return NextResponse.json(
        mobileSuccess({
          status: String(confirmation.status || ledger.status),
          buyerCompletionConfirmedAt: confirmation.buyerCompletionConfirmedAt,
          ownerCompletionConfirmedAt: confirmation.ownerCompletionConfirmedAt,
          message: "Your confirmation is recorded. The seller transfer remains held until the other party confirms deal completion.",
        }),
        { status: 200, headers: HEADERS },
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    if (
      process.env.RAZORPAY_ENABLED !== "true" ||
      process.env.RAZORPAY_ROUTE_ENABLED !== "true" ||
      process.env.RAZORPAY_PROPERTY_ADVANCE_SETTLEMENTS_ENABLED !== "true" ||
      !keyId ||
      !keySecret
    ) {
      return failure("Both parties confirmed completion. Razorpay settlement release is not enabled yet.", 503, true);
    }

    const activeMode = keyId.startsWith("rzp_test_")
      ? "test"
      : keyId.startsWith("rzp_live_")
        ? "live"
        : null;
    if (!activeMode || ledger.gateway_mode !== activeMode) {
      return failure("The matching Razorpay environment for this payment is unavailable.", 503, true);
    }

    const { data: release, error: releaseError } = await admin.rpc(
      "prepare_property_advance_settlement_release",
      { target_payment_id: ledger.id },
    );
    if (releaseError || !release) {
      return failure("The settlement release needs protected reconciliation.", 503, true);
    }
    if (release.status === "settled") {
      return NextResponse.json(
        mobileSuccess({ status: "settled", message: "Razorpay confirms the seller settlement is complete." }),
        { status: 200, headers: HEADERS },
      );
    }

    const transferId = String(release.gatewayTransferId || "");
    const sellerAccountId = String(release.sellerLinkedAccountId || "");
    if (!transferId || transferId !== ledger.gateway_transfer_id || !sellerAccountId) {
      return failure("The seller transfer reference requires protected review.", 409);
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    let transfer = (await razorpay.transfers.fetch(transferId)) as Transfer;
    if (
      transfer.id !== transferId ||
      transfer.recipient !== sellerAccountId ||
      Number(transfer.amount) !== Number(release.amountPaise) ||
      transfer.currency !== release.currency
    ) {
      return failure("Razorpay returned a transfer that does not match this seller and advance.", 409);
    }

    if (transfer.status === "reversed" || transfer.status === "failed") {
      return failure("The seller transfer cannot be released and needs protected review.", 409);
    }

    if (transfer.settlement_status === "on_hold") {
      await razorpay.transfers.edit(transferId, { on_hold: false });
      transfer = (await razorpay.transfers.fetch(transferId)) as Transfer;
    }

    if (
      transfer.id === transferId &&
      transfer.recipient === sellerAccountId &&
      Number(transfer.amount) === Number(release.amountPaise) &&
      transfer.currency === release.currency &&
      transfer.settlement_status === "settled" &&
      transfer.recipient_settlement_id
    ) {
      const { data: settled, error: settledError } = await admin.rpc(
        "record_property_advance_settled",
        {
          target_payment_id: ledger.id,
          target_gateway_transfer_id: transferId,
          target_recipient_settlement_id: transfer.recipient_settlement_id,
          target_settlement_status: transfer.settlement_status,
        },
      );
      if (settledError || settled?.status !== "settled") {
        return failure("Razorpay settled the transfer, but the ledger needs reconciliation.", 503, true);
      }

      return NextResponse.json(
        mobileSuccess({ status: "settled", message: "Razorpay confirms the seller settlement is complete." }),
        { status: 200, headers: HEADERS },
      );
    }

    return NextResponse.json(
      mobileSuccess({
        status: "settlement_release_pending",
        message: transfer.settlement_status === "on_hold"
          ? "The release request is processing. The seller transfer remains protected while Razorpay updates its status."
          : "Razorpay accepted the release from hold. Final seller settlement is still processing.",
      }),
      { status: 202, headers: HEADERS },
    );
  } catch (error) {
    if (error instanceof MobileAuthError) {
      const status = error.code === "CONFIGURATION_ERROR" ? 500 : 401;
      return NextResponse.json(
        mobileFailure(error.code, error.message),
        { status, headers: HEADERS },
      );
    }
    console.error("MOBILE_PROPERTY_ADVANCE_COMPLETION_FAILED");
    return failure("The settlement status is pending provider reconciliation.", 503, true);
  }
}
