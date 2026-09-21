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
  MobilePropertyLegalReviewError,
  buildMobilePropertyLegalReviewWorkspace,
  requestMobilePropertyLegalReview,
} from "@/lib/mobile/server/property-legal-review";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function errorResponse(error: unknown) {
  if (error instanceof MobileAuthError) {
    const status = error.code === "CONFIGURATION_ERROR" ? 500 : 401;
    return NextResponse.json(
      mobileFailure(error.code, error.message),
      { status, headers },
    );
  }

  if (error instanceof MobilePropertyLegalReviewError) {
    return NextResponse.json(
      mobileFailure(
        "PROPERTY_LEGAL_REVIEW_FAILED",
        error.message,
      ),
      { status: error.status, headers },
    );
  }

  console.error("MOBILE_PROPERTY_LEGAL_REVIEW_FAILED", error);
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_LEGAL_REVIEW_FAILED",
      "The confidential property legal-review workspace could not be loaded.",
      true,
    ),
    { status: 500, headers },
  );
}

export async function GET(request: Request) {
  try {
    const auth = await authenticateMobileRequest(request);
    const url = new URL(request.url);
    const unitId = clean(url.searchParams.get("unitId"));
    const requestId = clean(url.searchParams.get("requestId"));

    if (!unitId) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_LEGAL_REVIEW_FAILED",
          "Choose a property unit for confidential legal review.",
        ),
        { status: 400, headers },
      );
    }

    const workspace =
      await buildMobilePropertyLegalReviewWorkspace({
        userId: auth.user.id,
        unitId,
        requestId: requestId || undefined,
      });

    return NextResponse.json(mobileSuccess(workspace), {
      headers,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_LEGAL_REVIEW_FAILED",
          "Submit a valid confidential legal-review request.",
        ),
        { status: 400, headers },
      );
    }

    const workspace = await requestMobilePropertyLegalReview({
      buyerUserId: auth.user.id,
      unitId: clean(body.unitId),
      purpose: clean(body.purpose),
      consentVersion: clean(body.consentVersion),
      consentAccepted: body.consentAccepted === true,
    });

    return NextResponse.json(mobileSuccess(workspace), {
      status: 201,
      headers,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
