import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobileTrustedCaptureStart,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobileTrustedMediaTargetError,
  requireOwnedProjectUnitTarget,
} from "@/lib/mobile/server/trusted-media";
import {
  TrustedCaptureSessionError,
  createTrustedCaptureSession,
  getTrustedMediaEvidencePolicy,
} from "@/lib/trusted-media";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

const clean = (value: unknown, limit: number) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";

function failure(error: unknown) {
  if (error instanceof MobileAuthError) {
    return NextResponse.json(
      mobileFailure(error.code, error.message),
      {
        status: error.code === "CONFIGURATION_ERROR" ? 500 : 401,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  if (error instanceof MobileTrustedMediaTargetError) {
    return NextResponse.json(
      mobileFailure(
        "TRUSTED_MEDIA_FAILED",
        error.message,
        error.status >= 500,
      ),
      {
        status: error.status,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  if (error instanceof TrustedCaptureSessionError) {
    return NextResponse.json(
      mobileFailure(
        "TRUSTED_MEDIA_FAILED",
        error.message,
        error.status >= 500,
      ),
      {
        status: error.status,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  console.error("MOBILE_TRUSTED_CAPTURE_SESSION_FAILED", error);

  return NextResponse.json(
    mobileFailure(
      "TRUSTED_MEDIA_FAILED",
      "The live trusted-photo session could not be started.",
      true,
    ),
    {
      status: 500,
      headers: NO_STORE_HEADERS,
    },
  );
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        mobileFailure(
          "TRUSTED_MEDIA_FAILED",
          "A valid capture request is required.",
        ),
        {
          status: 400,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    const record = body as Record<string, unknown>;
    const entityId = clean(record.entityId, 80);
    const platform =
      record.platform === "ios" ? "ios" as const : "android" as const;

    const target = await requireOwnedProjectUnitTarget(
      auth.user.id,
      entityId,
    );

    const result = await createTrustedCaptureSession({
      ownerUserId: auth.user.id,
      entityType: "project_unit",
      entityId: target.entityId,
      platform,
      appVersion: clean(record.appVersion, 80) || null,
      deviceSessionId: clean(record.deviceSessionId, 160) || null,
    });

    const canonicalPolicy =
      getTrustedMediaEvidencePolicy("project_unit");

    const data: MobileTrustedCaptureStart = {
      session: {
        ...result.session,
        entityType: "project_unit",
        entityId: target.entityId,
        platform,
      },
      nonce: result.nonce,
      policy: {
        minimumLiveImages: 1,
        recommendedLiveImages:
          canonicalPolicy.recommendedLiveImages,
        maximumLiveImages:
          canonicalPolicy.maximumLiveImages ?? 12,
        maximumGpsAccuracyMetres:
          canonicalPolicy.maximumGpsAccuracyMetres,
        reviewGpsAccuracyMetres:
          canonicalPolicy.reviewGpsAccuracyMetres,
        galleryMaySatisfyMandatory: false,
        requiredEvidenceRole: "unit_overview",
      },
    };

    return NextResponse.json(mobileSuccess(data), {
      status: 201,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    return failure(error);
  }
}
