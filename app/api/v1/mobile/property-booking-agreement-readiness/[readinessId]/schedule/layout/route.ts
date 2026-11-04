import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobilePropertyBookingAgreementPrintLayoutUpdate,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyBookingAgreementReadinessError,
  updateMobilePropertyBookingAgreementPrintLayout,
} from "@/lib/mobile/server/property-booking-agreement-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

const PAGE_SIZES = new Set(["A4", "LEGAL", "CUSTOM_STAMP_PAPER"]);
const STAMP_TREATMENTS = new Set([
  "not_selected",
  "physical_stamp_paper",
  "e_stamp",
]);
const numeric = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function failure(error: unknown) {
  if (error instanceof MobileAuthError) {
    const status = error.code === "CONFIGURATION_ERROR" ? 500 : 401;
    return NextResponse.json(
      mobileFailure(error.code, error.message, false),
      { status, headers: HEADERS },
    );
  }

  if (error instanceof MobilePropertyBookingAgreementReadinessError) {
    return NextResponse.json(
      mobileFailure(
        "PROPERTY_AGREEMENT_READINESS_FAILED",
        error.message,
        error.status >= 500,
      ),
      { status: error.status, headers: HEADERS },
    );
  }

  console.error("MOBILE_PROPERTY_AGREEMENT_PRINT_LAYOUT_FAILED");
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_AGREEMENT_READINESS_FAILED",
      "The private print-layout settings could not be saved.",
      true,
    ),
    { status: 500, headers: HEADERS },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ readinessId: string }> },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body = (await request.json().catch(() => null)) as
      | (Partial<MobilePropertyBookingAgreementPrintLayoutUpdate> & {
          readinessId?: unknown;
        })
      | null;
    const { readinessId: rawReadinessId } = await context.params;
    const readinessId = String(rawReadinessId || "").trim();

    if (
      !body ||
      (body.readinessId !== undefined &&
        String(body.readinessId).trim() !== readinessId)
    ) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_AGREEMENT_READINESS_FAILED",
          "The agreement-readiness reference does not match.",
          false,
        ),
        { status: 400, headers: HEADERS },
      );
    }

    if (
      !PAGE_SIZES.has(String(body.pageSize)) ||
      !numeric(body.marginTopMm) ||
      !numeric(body.marginRightMm) ||
      !numeric(body.marginBottomMm) ||
      !numeric(body.marginLeftMm) ||
      !STAMP_TREATMENTS.has(String(body.stampTreatment)) ||
      !numeric(body.firstPageTopOffsetMm) ||
      !numeric(body.continuationPageTopOffsetMm) ||
      typeof body.pageNumberingEnabled !== "boolean" ||
      typeof body.scheduleStartsOnNewPage !== "boolean" ||
      typeof body.annexuresStartOnNewPage !== "boolean" ||
      typeof body.signatureWitnessOnSeparatePage !== "boolean" ||
      !(
        body.customPageWidthMm === null ||
        numeric(body.customPageWidthMm)
      ) ||
      !(
        body.customPageHeightMm === null ||
        numeric(body.customPageHeightMm)
      )
    ) {
      return NextResponse.json(
        mobileFailure(
          "PROPERTY_AGREEMENT_READINESS_FAILED",
          "Submit supported paper, stamp, margin, and pagination settings.",
          false,
        ),
        { status: 400, headers: HEADERS },
      );
    }

    const workspace =
      await updateMobilePropertyBookingAgreementPrintLayout({
        ownerUserId: auth.user.id,
        update: {
          readinessId,
          pageSize: body.pageSize as
            MobilePropertyBookingAgreementPrintLayoutUpdate["pageSize"],
          marginTopMm: body.marginTopMm,
          marginRightMm: body.marginRightMm,
          marginBottomMm: body.marginBottomMm,
          marginLeftMm: body.marginLeftMm,
          customPageWidthMm: body.customPageWidthMm,
          customPageHeightMm: body.customPageHeightMm,
          stampTreatment: body.stampTreatment as
            MobilePropertyBookingAgreementPrintLayoutUpdate["stampTreatment"],
          firstPageTopOffsetMm: body.firstPageTopOffsetMm,
          continuationPageTopOffsetMm:
            body.continuationPageTopOffsetMm,
          pageNumberingEnabled: body.pageNumberingEnabled,
          scheduleStartsOnNewPage: body.scheduleStartsOnNewPage,
          annexuresStartOnNewPage: body.annexuresStartOnNewPage,
          signatureWitnessOnSeparatePage:
            body.signatureWitnessOnSeparatePage,
        },
      });

    return NextResponse.json(mobileSuccess(workspace), {
      status: 200,
      headers: HEADERS,
    });
  } catch (error) {
    return failure(error);
  }
}
