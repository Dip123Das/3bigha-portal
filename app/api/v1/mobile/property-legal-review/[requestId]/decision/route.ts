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
  decideMobilePropertyLegalReview,
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
    const status =
      error.code === "CONFIGURATION_ERROR" ? 500 : 401;
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

  console.error("MOBILE_PROPERTY_LEGAL_REVIEW_DECISION_FAILED", error);
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_LEGAL_REVIEW_FAILED",
      "The confidential legal-review decision could not be saved.",
      true,
    ),
    { status: 500, headers },
  );
}

export async function POST(
  request: Request,
  context: { params: { requestId: string } },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_LEGAL_REVIEW_FAILED",
          "Submit a valid legal-review decision.",
        ),
        { status: 400, headers },
      );
    }

    const workspace = await decideMobilePropertyLegalReview({
      ownerUserId: auth.user.id,
      requestId: clean(context.params.requestId),
      decision: clean(body.decision) as
        | "granted"
        | "declined"
        | "revoked",
      decisionNote: clean(body.decisionNote) || null,
    });

    return NextResponse.json(mobileSuccess(workspace), {
      headers,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
