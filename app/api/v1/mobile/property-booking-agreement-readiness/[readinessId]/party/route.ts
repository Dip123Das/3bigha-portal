import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobilePropertyBookingAgreementPartySubmission,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingAgreementReadinessError,
  submitMobilePropertyBookingAgreementPartyInput,
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

function nullableText(value: unknown) {
  const text = clean(value);
  return text || null;
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

export async function POST(
  request: Request,
  context: { params: { readinessId: string } },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body =
      (await request.json().catch(() => null)) as
        | Partial<MobilePropertyBookingAgreementPartySubmission>
        | null;
    const readinessId = clean(context.params.readinessId);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_AGREEMENT_READINESS_FAILED",
          "Submit valid structured agreement particulars.",
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

    if (
      body.inputVersion !==
        "property-agreement-party-input-v1" ||
      body.consentAccepted !== true
    ) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_AGREEMENT_READINESS_FAILED",
          "Confirm the current agreement-readiness acknowledgement.",
          false,
        ),
        { status: 400, headers },
      );
    }

    const workspace =
      await submitMobilePropertyBookingAgreementPartyInput({
        actorUserId: auth.user.id,
        submission: {
          readinessId,
          legalName: clean(body.legalName),
          relationType: body.relationType ?? null,
          relationName: nullableText(body.relationName),
          addressLine1: clean(body.addressLine1),
          addressLine2: nullableText(body.addressLine2),
          villageOrLocality:
            nullableText(body.villageOrLocality),
          postOffice: nullableText(body.postOffice),
          policeStation: nullableText(body.policeStation),
          blockOrMunicipality:
            nullableText(body.blockOrMunicipality),
          district: clean(body.district),
          state: clean(body.state),
          pincode: clean(body.pincode),
          identityDocumentType:
            body.identityDocumentType as
              MobilePropertyBookingAgreementPartySubmission[
                "identityDocumentType"
              ],
          identityMaskedReference:
            clean(body.identityMaskedReference),
          authorityCapacity:
            nullableText(body.authorityCapacity),
          inputVersion:
            "property-agreement-party-input-v1",
          consentAccepted: true,
        },
      });

    return NextResponse.json(mobileSuccess(workspace), {
      status: 200,
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
