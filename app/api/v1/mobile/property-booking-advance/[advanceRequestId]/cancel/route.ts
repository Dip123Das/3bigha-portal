import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobilePropertyBookingAdvanceCancellation,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingAdvanceError,
  cancelMobilePropertyBookingAdvance,
} from "@/lib/mobile/server/property-booking-advance";

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
    const status =
      error.code === "CONFIGURATION_ERROR" ? 500 : 401;
    return NextResponse.json(
      mobileFailure(error.code, error.message, false),
      { status, headers },
    );
  }

  if (error instanceof MobilePropertyBookingAdvanceError) {
    return NextResponse.json(
      mobileFailure(
        "PROPERTY_BOOKING_ADVANCE_FAILED",
        error.message,
        error.status >= 500,
      ),
      { status: error.status, headers },
    );
  }

  console.error(
    "Mobile property-advance cancellation failed",
    error,
  );
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_BOOKING_ADVANCE_FAILED",
      "The private property-advance request could not be cancelled.",
      true,
    ),
    { status: 500, headers },
  );
}

export async function POST(
  request: Request,
  context: { params: { advanceRequestId: string } },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body =
      (await request.json().catch(() => ({}))) as
        Partial<MobilePropertyBookingAdvanceCancellation>;
    const advanceRequestId = clean(
      context.params.advanceRequestId,
    );

    if (
      body.advanceRequestId !== undefined &&
      clean(body.advanceRequestId) !== advanceRequestId
    ) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_BOOKING_ADVANCE_FAILED",
          "The private advance reference does not match.",
        ),
        { status: 400, headers },
      );
    }

    const workspace = await cancelMobilePropertyBookingAdvance({
      buyerUserId: auth.user.id,
      advanceRequestId,
      reason:
        typeof body.reason === "string" ? body.reason : null,
    });

    return NextResponse.json(mobileSuccess(workspace), {
      status: 200,
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
