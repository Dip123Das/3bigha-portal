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
import {
  MobileVendorConversationError,
  markMobileVendorConversationRead,
} from "@/lib/mobile/server/vendor-conversation";

type RouteContext = {
  params: {
    conversationId: string;
  };
};

const headers = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body = await request.json().catch(() => ({}));

    const state = await markMobileVendorConversationRead(
      auth.supabase,
      auth.user,
      decodeURIComponent(params.conversationId || ""),
      body?.lastSeenMessageId,
    );

    return NextResponse.json(mobileSuccess(state), {
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

    if (error instanceof MobileVendorConversationError) {
      return NextResponse.json(
        mobileFailure(
          "VENDOR_WORKSPACE_FAILED",
          error.message,
          error.status >= 500,
        ),
        {
          status: error.status,
          headers,
        },
      );
    }

    console.error(
      "Mobile vendor conversation read-state failed",
      error,
    );

    return NextResponse.json(
      mobileFailure(
        "VENDOR_WORKSPACE_FAILED",
        "Your conversation read state could not be updated.",
        true,
      ),
      {
        status: 500,
        headers,
      },
    );
  }
}
