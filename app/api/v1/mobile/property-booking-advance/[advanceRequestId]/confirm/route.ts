import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobilePropertyBookingAdvanceConfirmation,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingAdvanceError,
  confirmMobilePropertyBookingAdvance,
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
    "Mobile property-advance confirmation failed",
    error,
  );
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_BOOKING_ADVANCE_FAILED",
      "The private property-advance confirmation could not be saved.",
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
      (await request.json().catch(() => null)) as
        | Partial<MobilePropertyBookingAdvanceConfirmation>
        | null;
    const advanceRequestId = clean(
      context.params.advanceRequestId,
    );

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_BOOKING_ADVANCE_FAILED",
          "Confirm the private property-advance acknowledgement.",
        ),
        { status: 400, headers },
      );
    }

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

    if (
      body.consentAccepted !== true ||
      body.consentVersion !== "property-booking-advance-v1"
    ) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_BOOKING_ADVANCE_FAILED",
          "Confirm the current private property-advance acknowledgement.",
        ),
        { status: 400, headers },
      );
    }

    const workspace = await confirmMobilePropertyBookingAdvance({
      buyerUserId: auth.user.id,
      confirmation: {
        advanceRequestId,
        consentVersion: "property-booking-advance-v1",
        consentAccepted: true,
      },
    });

    return NextResponse.json(mobileSuccess(workspace), {
      status: 200,
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
