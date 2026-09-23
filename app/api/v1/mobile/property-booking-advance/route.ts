import { NextRequest, NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobilePropertyBookingAdvanceProposal,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingAdvanceError,
  buildMobilePropertyBookingAdvanceWorkspace,
  proposeMobilePropertyBookingAdvance,
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
    "Mobile property-advance readiness route failed",
    error,
  );
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_BOOKING_ADVANCE_FAILED",
      "The private property-advance workspace is temporarily unavailable.",
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
      await buildMobilePropertyBookingAdvanceWorkspace({
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
        | Partial<MobilePropertyBookingAdvanceProposal>
        | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_BOOKING_ADVANCE_FAILED",
          "Submit a valid private advance proposal.",
        ),
        { status: 400, headers },
      );
    }

    const advanceAmountPaise = Number(body.advanceAmountPaise);

    const workspace = await proposeMobilePropertyBookingAdvance({
      ownerUserId: auth.user.id,
      proposal: {
        applicationId: clean(body.applicationId),
        advanceAmountPaise,
        ownerTermsNote:
          typeof body.ownerTermsNote === "string"
            ? body.ownerTermsNote
            : null,
      },
    });

    return NextResponse.json(mobileSuccess(workspace), {
      status: 201,
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
