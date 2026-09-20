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
  MobileTrustedMediaTargetError,
  buildMobileTrustedMediaTargets,
} from "@/lib/mobile/server/trusted-media";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

export async function GET(request: Request) {
  try {
    const auth = await authenticateMobileRequest(request);
    const targets = await buildMobileTrustedMediaTargets(auth.user.id);

    return NextResponse.json(mobileSuccess(targets), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
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

    console.error("MOBILE_TRUSTED_MEDIA_TARGETS_FAILED", error);

    return NextResponse.json(
      mobileFailure(
        "TRUSTED_MEDIA_FAILED",
        "Your trusted-photo capture targets could not be prepared.",
        true,
      ),
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      },
    );
  }
}
