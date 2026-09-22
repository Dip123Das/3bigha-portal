import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobilePropertyBookingApplicationDecision,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingApplicationError,
  decideMobilePropertyBookingApplication,
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
    "Mobile property booking-application decision failed",
    error,
  );
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_BOOKING_APPLICATION_FAILED",
      "The booking-application decision could not be saved.",
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
      (await request.json().catch(() => null)) as
        | Partial<MobilePropertyBookingApplicationDecision>
        | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_BOOKING_APPLICATION_FAILED",
          "Submit a valid booking-application decision.",
          false,
        ),
        { status: 400, headers },
      );
    }

    const workspace =
      await decideMobilePropertyBookingApplication({
        ownerUserId: auth.user.id,
        applicationId: clean(context.params.applicationId),
        decision: clean(body.decision) as
          MobilePropertyBookingApplicationDecision["decision"],
        decisionNote:
          typeof body.decisionNote === "string"
            ? body.decisionNote
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
