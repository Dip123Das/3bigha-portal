import { NextRequest, NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobilePropertyBookingAgreementReadinessCreate,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingAgreementReadinessError,
  buildMobilePropertyBookingAgreementWorkspace,
  createMobilePropertyBookingAgreementReadiness,
} from "@/lib/mobile/server/property-booking-agreement-readiness";

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
    MobilePropertyBookingAgreementReadinessError
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
    "Mobile property agreement-readiness route failed",
    error,
  );
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_AGREEMENT_READINESS_FAILED",
      "The private agreement-readiness workspace is temporarily unavailable.",
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
      await buildMobilePropertyBookingAgreementWorkspace({
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
        | Partial<MobilePropertyBookingAgreementReadinessCreate>
        | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_AGREEMENT_READINESS_FAILED",
          "Submit a valid agreement-readiness request.",
          false,
        ),
        { status: 400, headers },
      );
    }

    const workspace =
      await createMobilePropertyBookingAgreementReadiness({
        actorUserId: auth.user.id,
        request: {
          applicationId: clean(body.applicationId),
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
