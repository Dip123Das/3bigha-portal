export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import { buildMobileVendorWorkspace } from "@/lib/mobile/server/vendor-workspace";

const headers = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export async function GET(request: Request) {
  try {
    const auth = await authenticateMobileRequest(request);

    const workspace = await buildMobileVendorWorkspace(
      auth.supabase,
      auth.user,
    );

    return NextResponse.json(mobileSuccess(workspace), {
      status: 200,
      headers,
    });
  } catch (error) {
    if (error instanceof MobileAuthError) {
      return NextResponse.json(
        mobileFailure(error.code, error.message),
        {
          status:
            error.code === "CONFIGURATION_ERROR" ? 500 : 401,
          headers,
        },
      );
    }

    console.error("Mobile vendor workspace failed", error);

    return NextResponse.json(
      mobileFailure(
        "VENDOR_WORKSPACE_FAILED",
        "Your vendor updates could not be prepared.",
        true,
      ),
      {
        status: 500,
        headers,
      },
    );
  }
}
