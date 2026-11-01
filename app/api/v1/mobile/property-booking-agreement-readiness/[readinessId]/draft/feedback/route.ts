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
  MobilePropertyBookingAgreementDraftFeedbackError,
  recordMobilePropertyBookingAgreementDraftFeedback,
} from "@/lib/mobile/server/property-booking-agreement-draft-feedback";

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
    error instanceof MobilePropertyBookingAgreementDraftFeedbackError
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

  console.error("MOBILE_PROPERTY_AGREEMENT_DRAFT_FEEDBACK_FAILED");
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_AGREEMENT_READINESS_FAILED",
      "The party feedback could not be saved.",
      true,
    ),
    { status: 500, headers: HEADERS },
  );
}

export async function POST(
  request: Request,
  context: { params: { readinessId: string } },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const readinessId = clean(context.params.readinessId);
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (
      !body ||
      typeof body.draftId !== "string" ||
      typeof body.draftContentSha256 !== "string" ||
      typeof body.noteText !== "string" ||
      (body.replyToFeedbackId !== undefined &&
        body.replyToFeedbackId !== null &&
        typeof body.replyToFeedbackId !== "string") ||
      Object.keys(body).some(
        (key) =>
          ![
            "readinessId",
            "draftId",
            "draftContentSha256",
            "noteText",
            "replyToFeedbackId",
          ].includes(key),
      ) ||
      (body.readinessId !== undefined &&
        clean(body.readinessId) !== readinessId)
    ) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_AGREEMENT_READINESS_FAILED",
          "Submit only feedback for the current draft version.",
          false,
        ),
        { status: 400, headers: HEADERS },
      );
    }

    const result =
      await recordMobilePropertyBookingAgreementDraftFeedback({
        actorUserId: auth.user.id,
        readinessId,
        draftId: clean(body.draftId),
        draftContentSha256: clean(body.draftContentSha256),
        noteText: clean(body.noteText),
        replyToFeedbackId:
          body.replyToFeedbackId === null ||
          body.replyToFeedbackId === undefined
            ? null
            : clean(body.replyToFeedbackId),
      });

    return NextResponse.json(mobileSuccess(result), {
      status: 200,
      headers: HEADERS,
    });
  } catch (error) {
    return failure(error);
  }
}
