import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobilePropertyBookingApplicationCancellation,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingApplicationError,
  cancelMobilePropertyBookingApplication,
} from "@/lib/mobile/server/property-booking-application";

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

  if (error instanceof MobilePropertyBookingApplicationError) {
    return NextResponse.json(
      mobileFailure(
        "PROPERTY_BOOKING_APPLICATION_FAILED",
        error.message,
        error.status >= 500,
      ),
      { status: error.status, headers },
    );
  }

  console.error(
    "Mobile property booking-application cancellation failed",
    error,
  );
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_BOOKING_APPLICATION_FAILED",
      "The booking application could not be cancelled.",
      true,
    ),
    { status: 500, headers },
  );
}

export async function POST(
  request: Request,
  context: { params: { applicationId: string } },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body =
      (await request.json().catch(() => ({}))) as
        Partial<MobilePropertyBookingApplicationCancellation>;

    const workspace =
      await cancelMobilePropertyBookingApplication({
        buyerUserId: auth.user.id,
        applicationId: clean(context.params.applicationId),
        reason:
          typeof body.reason === "string"
            ? body.reason
            : null,
      });

    return NextResponse.json(mobileSuccess(workspace), {
      status: 200,
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
