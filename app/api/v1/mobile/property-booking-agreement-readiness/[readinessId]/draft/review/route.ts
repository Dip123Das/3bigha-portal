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
  MobilePropertyBookingAgreementDraftReviewError,
  recordMobilePropertyBookingAgreementDraftReview,
} from "@/lib/mobile/server/property-booking-agreement-draft-review";

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
    error instanceof
    MobilePropertyBookingAgreementDraftReviewError
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

  console.error("MOBILE_PROPERTY_AGREEMENT_DRAFT_REVIEW_FAILED");
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_AGREEMENT_READINESS_FAILED",
      "The draft review acknowledgement could not be saved.",
      true,
    ),
    { status: 500, headers: HEADERS },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ readinessId: string }> },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const { readinessId: rawReadinessId } = await context.params;
    const readinessId = clean(rawReadinessId);
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (
      !body ||
      Object.keys(body).some(
        (key) =>
          ![
            "readinessId",
            "draftId",
            "draftContentSha256",
          ].includes(key),
      ) ||
      (body.readinessId !== undefined &&
        clean(body.readinessId) !== readinessId)
    ) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_AGREEMENT_READINESS_FAILED",
          "Submit only the current draft review reference.",
          false,
        ),
        { status: 400, headers: HEADERS },
      );
    }

    const result =
      await recordMobilePropertyBookingAgreementDraftReview({
        actorUserId: auth.user.id,
        readinessId,
        draftId: clean(body.draftId),
        draftContentSha256: clean(body.draftContentSha256),
      });

    return NextResponse.json(mobileSuccess(result), {
      status: 200,
      headers: HEADERS,
    });
  } catch (error) {
    return failure(error);
  }
}
