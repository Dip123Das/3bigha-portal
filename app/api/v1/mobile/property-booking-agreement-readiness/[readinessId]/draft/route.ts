import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingAgreementDraftReadError,
  buildMobilePropertyBookingAgreementAdvisoryDraftWorkspace,
} from "@/lib/mobile/server/property-booking-agreement-draft-read";

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

  if (
    error instanceof
    MobilePropertyBookingAgreementDraftReadError
  ) {
    return NextResponse.json(
      mobileFailure(
        "PROPERTY_AGREEMENT_READINESS_FAILED",
        error.message,
        error.status >= 500,
      ),
      { status: error.status, headers },
    );
  }

  console.error(
    "Mobile property agreement advisory-draft read route failed",
    error,
  );

  return NextResponse.json(
    mobileFailure(
      "PROPERTY_AGREEMENT_READINESS_FAILED",
      "The private advisory draft is temporarily unavailable.",
      true,
    ),
    { status: 500, headers },
  );
}

export async function GET(
  request: Request,
  context: { params: { readinessId: string } },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const readinessId = clean(context.params.readinessId);

    const workspace =
      await buildMobilePropertyBookingAgreementAdvisoryDraftWorkspace({
        userId: auth.user.id,
        readinessId,
      });

    return NextResponse.json(mobileSuccess(workspace), {
      status: 200,
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
