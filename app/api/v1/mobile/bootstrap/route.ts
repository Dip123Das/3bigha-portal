export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { mobileFailure, mobileSuccess } from "@/lib/mobile/contracts/v1";
import { MobileAuthError, authenticateMobileRequest } from "@/lib/mobile/server/auth";
import { buildMobileBootstrap } from "@/lib/mobile/server/bootstrap";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

export async function GET(request: Request) {
  try {
    const auth = await authenticateMobileRequest(request);
    const bootstrap = await buildMobileBootstrap(auth.supabase, auth.user);

    return NextResponse.json(mobileSuccess(bootstrap), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    if (error instanceof MobileAuthError) {
      const status = error.code === "CONFIGURATION_ERROR" ? 500 : 401;
      return NextResponse.json(mobileFailure(error.code, error.message), {
        status,
        headers: NO_STORE_HEADERS,
      });
    }

    console.error("MOBILE_BOOTSTRAP_FAILED", error);
    return NextResponse.json(
      mobileFailure("BOOTSTRAP_FAILED", "Your workspace could not be prepared.", true),
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
