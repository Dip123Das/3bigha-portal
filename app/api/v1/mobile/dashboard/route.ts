export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { mobileFailure, mobileSuccess } from "@/lib/mobile/contracts/v1";
import { MobileAuthError, authenticateMobileRequest } from "@/lib/mobile/server/auth";
import { buildMobileDashboardAggregate } from "@/lib/mobile/server/dashboard-aggregates";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie, Authorization" };

export async function GET(request: Request) {
  try {
    const auth = await authenticateMobileRequest(request);
    return NextResponse.json(mobileSuccess(await buildMobileDashboardAggregate(auth.supabase, auth.user)), { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof MobileAuthError) return NextResponse.json(mobileFailure(error.code, error.message), { status: error.code === "CONFIGURATION_ERROR" ? 500 : 401, headers: NO_STORE_HEADERS });
    console.error("MOBILE_DASHBOARD_AGGREGATE_FAILED", error);
    return NextResponse.json(mobileFailure("BOOTSTRAP_FAILED", "Your work summary could not be prepared.", true), { status: 500, headers: NO_STORE_HEADERS });
  }
}
