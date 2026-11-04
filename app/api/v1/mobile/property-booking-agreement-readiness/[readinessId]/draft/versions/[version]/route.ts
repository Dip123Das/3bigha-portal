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
  readMobilePropertyBookingAgreementDraftVersion,
} from "@/lib/mobile/server/property-booking-agreement-draft-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
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
      { status, headers: HEADERS },
    );
  }

  if (
    error instanceof MobilePropertyBookingAgreementDraftReadError
  ) {
    return NextResponse.json(
      mobileFailure(
        "PROPERTY_AGREEMENT_READINESS_FAILED",
        error.message,
        error.status >= 500,
      ),
      { status: error.status, headers: HEADERS },
    );
  }

  console.error("MOBILE_PROPERTY_AGREEMENT_DRAFT_VERSION_READ_FAILED");
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_AGREEMENT_READINESS_FAILED",
      "The private draft version is temporarily unavailable.",
      true,
    ),
    { status: 500, headers: HEADERS },
  );
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ readinessId: string; version: string }>;
  },
) {
  try {
    const auth = await authenticateMobileRequest(_request);
    const resolvedParams = await context.params;
    const result = await readMobilePropertyBookingAgreementDraftVersion({
      userId: auth.user.id,
      readinessId: clean(resolvedParams.readinessId),
      version: Number(resolvedParams.version),
    });

    return NextResponse.json(mobileSuccess(result), {
      status: 200,
      headers: HEADERS,
    });
  } catch (error) {
    return failure(error);
  }
}
