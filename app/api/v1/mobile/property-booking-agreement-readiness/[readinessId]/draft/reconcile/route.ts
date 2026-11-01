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
  MobilePropertyBookingAgreementDraftReconcileError,
  reconcileMobilePropertyBookingAgreementDraft,
} from "@/lib/mobile/server/property-booking-agreement-draft-reconcile";

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
    MobilePropertyBookingAgreementDraftReconcileError
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

  console.error(
    "MOBILE_PROPERTY_AGREEMENT_DRAFT_RECONCILIATION_FAILED",
  );
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_AGREEMENT_READINESS_FAILED",
      "The changed-source draft could not be reconciled.",
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
      Object.keys(body).some(
        (key) => !["readinessId", "draftId"].includes(key),
      ) ||
      (body.readinessId !== undefined &&
        clean(body.readinessId) !== readinessId)
    ) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_AGREEMENT_READINESS_FAILED",
          "Submit only the current changed-source draft reference.",
          false,
        ),
        { status: 400, headers: HEADERS },
      );
    }

    const result =
      await reconcileMobilePropertyBookingAgreementDraft({
        actorUserId: auth.user.id,
        readinessId,
        draftId: clean(body.draftId),
      });

    return NextResponse.json(mobileSuccess(result), {
      status: 200,
      headers: HEADERS,
    });
  } catch (error) {
    return failure(error);
  }
}
