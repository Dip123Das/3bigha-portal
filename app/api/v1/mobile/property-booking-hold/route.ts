import { NextRequest, NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobilePropertyUnitHoldAcquire,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingHoldError,
  acquireMobilePropertyUnitHold,
  buildMobilePropertyUnitHoldWorkspace,
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
  console.error("Mobile property booking-hold route failed", error);
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_BOOKING_HOLD_FAILED",
      "The property booking-hold workspace is temporarily unavailable.",
      true,
    ),
    { status: 500, headers },
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request);
    const unitId = clean(request.nextUrl.searchParams.get("unitId"));
    const workspace = await buildMobilePropertyUnitHoldWorkspace({
      userId: auth.user.id,
      unitId,
    });
    return NextResponse.json(
      mobileSuccess(workspace),
      { status: 200, headers },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body =
      (await request.json()) as Partial<MobilePropertyUnitHoldAcquire>;
    const workspace = await acquireMobilePropertyUnitHold({
      buyerUserId: auth.user.id,
      request: {
        unitId: clean(body.unitId),
        legalReviewRequestId: clean(body.legalReviewRequestId),
        intentVersion:
          body.intentVersion === "property-unit-booking-intent-v1"
            ? body.intentVersion
            : "property-unit-booking-intent-v1",
        acknowledgedAt: clean(body.acknowledgedAt),
      },
    });
    return NextResponse.json(
      mobileSuccess(workspace),
      { status: 201, headers },
    );
  } catch (error) {
    return failure(error);
  }
}
