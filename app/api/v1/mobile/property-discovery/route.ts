export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { mobileFailure, mobileSuccess } from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import { buildMobilePropertyDiscovery } from "@/lib/mobile/server/property-discovery";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

function selectedSlug(request: Request) {
  const value = new URL(request.url).searchParams
    .get("slug")
    ?.trim()
    .toLowerCase();
  return value ? value.slice(0, 160) : null;
}

export async function GET(request: Request) {
  try {
    await authenticateMobileRequest(request);

    const discovery = await buildMobilePropertyDiscovery(
      getSupabaseAdmin(),
      selectedSlug(request),
    );

    return NextResponse.json(mobileSuccess(discovery), {
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

    console.error("MOBILE_PROPERTY_DISCOVERY_FAILED", error);
    return NextResponse.json(
      mobileFailure(
        "PROPERTY_DISCOVERY_FAILED",
        "Property projects could not be loaded safely.",
        true,
      ),
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      },
    );
  }
}
