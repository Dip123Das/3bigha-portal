import { NextRequest, NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobilePropertyUnitHoldCancellation,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingHoldError,
  cancelMobilePropertyUnitHold,
} from "@/lib/mobile/server/property-booking-hold";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function failure(error: unknown) {
  if (error instanceof MobileAuthError) {
    const status = error.code === "CONFIGURATION_ERROR" ? 500 : 401;
    return NextResponse.json(
      mobileFailure(error.code, error.message, false),
      { status, headers },
    );
  }
  if (error instanceof MobilePropertyBookingHoldError) {
    return NextResponse.json(
      mobileFailure(
        "PROPERTY_BOOKING_HOLD_FAILED",
        error.message,
        error.status >= 500,
      ),
      { status: error.status, headers },
    );
  }
  console.error("Mobile property hold cancellation failed", error);
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_BOOKING_HOLD_FAILED",
      "The property-unit hold could not be cancelled.",
      true,
    ),
    { status: 500, headers },
  );
}

export async function POST(
  request: NextRequest,
  context: { params: { holdId: string } },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body =
      (await request.json().catch(() => ({}))) as
        Partial<MobilePropertyUnitHoldCancellation>;
    const workspace = await cancelMobilePropertyUnitHold({
      buyerUserId: auth.user.id,
      holdId: clean(context.params.holdId),
      reason: typeof body.reason === "string" ? body.reason : null,
    });
    return NextResponse.json(
      mobileSuccess(workspace),
      { status: 200, headers },
    );
  } catch (error) {
    return failure(error);
  }
}
