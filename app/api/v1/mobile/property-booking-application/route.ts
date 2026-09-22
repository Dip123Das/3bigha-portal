import { NextRequest, NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobilePropertyBookingApplicationSubmit,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingApplicationError,
  buildMobilePropertyBookingApplicationWorkspace,
  submitMobilePropertyBookingApplication,
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
    "Mobile property booking-application route failed",
    error,
  );
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_BOOKING_APPLICATION_FAILED",
      "The private booking-application workspace is temporarily unavailable.",
      true,
    ),
    { status: 500, headers },
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request);
    const unitId = clean(
      request.nextUrl.searchParams.get("unitId"),
    );
    const workspace =
      await buildMobilePropertyBookingApplicationWorkspace({
        userId: auth.user.id,
        unitId,
      });

    return NextResponse.json(mobileSuccess(workspace), {
      status: 200,
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body =
      (await request.json().catch(() => null)) as
        | Partial<MobilePropertyBookingApplicationSubmit>
        | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_BOOKING_APPLICATION_FAILED",
          "Submit a valid property booking application.",
          false,
        ),
        { status: 400, headers },
      );
    }

    const workspace =
      await submitMobilePropertyBookingApplication({
        buyerUserId: auth.user.id,
        holdId: clean(body.holdId),
        intentVersion: clean(body.intentVersion),
        acknowledgedAt: clean(body.acknowledgedAt),
        buyerMessage:
          typeof body.buyerMessage === "string"
            ? body.buyerMessage
            : null,
      });

    return NextResponse.json(mobileSuccess(workspace), {
      status: 201,
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
