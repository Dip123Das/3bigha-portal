import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
} from "@/lib/mobile/contracts/v1";
import {
  authenticateMobileRequest,
  MobileAuthError,
} from "@/lib/mobile/server/auth";
import {
  attachTrustedMediaAssetToProjectUnit,
  MobileTrustedMediaTargetError,
} from "@/lib/mobile/server/trusted-media";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

type AttachBody = {
  unitId?: unknown;
  assetId?: unknown;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function failure(error: unknown) {
  if (error instanceof MobileAuthError) {
    return NextResponse.json(
      mobileFailure(error.code, error.message),
      {
        status: error.code === "CONFIGURATION_ERROR" ? 500 : 401,
        headers,
      },
    );
  }

  if (error instanceof MobileTrustedMediaTargetError) {
    return NextResponse.json(
      mobileFailure("TRUSTED_MEDIA_FAILED", error.message),
      { status: error.status, headers },
    );
  }

  console.error("MOBILE_TRUSTED_MEDIA_ATTACHMENT_FAILED", error);

  return NextResponse.json(
    mobileFailure(
      "TRUSTED_MEDIA_FAILED",
      "The trusted photo could not be attached to the project unit.",
      true,
    ),
    { status: 500, headers },
  );
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const { sessionId: rawSessionId } = await context.params;
    const sessionId = clean(rawSessionId);

    if (!UUID.test(sessionId)) {
      return NextResponse.json(
        mobileFailure(
          "TRUSTED_MEDIA_FAILED",
          "A valid trusted capture session is required.",
        ),
        { status: 400, headers },
      );
    }

    const body = (await request.json()) as AttachBody;
    const unitId = clean(body.unitId);
    const assetId = clean(body.assetId);

    if (!UUID.test(unitId) || !UUID.test(assetId)) {
      return NextResponse.json(
        mobileFailure(
          "TRUSTED_MEDIA_FAILED",
          "A valid project unit and trusted-media asset are required.",
        ),
        { status: 400, headers },
      );
    }

    const target = await attachTrustedMediaAssetToProjectUnit(
      auth.user.id,
      unitId,
      assetId,
      sessionId,
    );

    return NextResponse.json(mobileSuccess(target), { headers });
  } catch (error) {
    return failure(error);
  }
}
