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
  PropertyAgreementDraftWorkerError,
  generatePropertyBookingAgreementAdvisoryDraft,
} from "@/lib/mobile/server/property-booking-agreement-draft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

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

  if (error instanceof PropertyAgreementDraftWorkerError) {
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
    "Mobile property agreement advisory-generation route failed",
    error,
  );

  return NextResponse.json(
    mobileFailure(
      "PROPERTY_AGREEMENT_READINESS_FAILED",
      "The private advisory agreement draft could not be generated.",
      true,
    ),
    { status: 500, headers },
  );
}

export async function POST(
  request: Request,
  context: { params: { readinessId: string } },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const readinessId = clean(context.params.readinessId);
    const body =
      (await request.json().catch(() => ({}))) as
        Record<string, unknown>;

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_AGREEMENT_READINESS_FAILED",
          "Submit a valid advisory-draft generation request.",
          false,
        ),
        { status: 400, headers },
      );
    }

    const suppliedKeys = Object.keys(body);

    if (
      suppliedKeys.some(
        (key) => key !== "readinessId",
      )
    ) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_AGREEMENT_READINESS_FAILED",
          "The advisory-draft request contains an unsupported field.",
          false,
        ),
        { status: 400, headers },
      );
    }

    if (
      body.readinessId !== undefined &&
      clean(body.readinessId) !== readinessId
    ) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_AGREEMENT_READINESS_FAILED",
          "The agreement-readiness reference does not match.",
          false,
        ),
        { status: 400, headers },
      );
    }

    const result =
      await generatePropertyBookingAgreementAdvisoryDraft({
        actorUserId: auth.user.id,
        readinessId,
      });

    return NextResponse.json(mobileSuccess(result), {
      status: 200,
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
