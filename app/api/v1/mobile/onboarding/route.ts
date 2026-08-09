export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { mobileFailure, mobileSuccess } from "@/lib/mobile/contracts/v1";
import { authenticateMobileRequest, MobileAuthError } from "@/lib/mobile/server/auth";
import { attachMobileEvidence, declareMobileIdentity, evaluateMobileRegistration, loadMobileOnboarding, MobileOnboardingError, saveMobileBusiness, saveMobileProfile, uploadMobileEvidence, verifyMobileLocation } from "@/lib/mobile/server/onboarding";

const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie, Authorization" };

function failure(error: unknown) {
  if (error instanceof MobileAuthError) return NextResponse.json(mobileFailure(error.code, error.message), { status: error.code === "CONFIGURATION_ERROR" ? 500 : 401, headers });
  if (error instanceof MobileOnboardingError) return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status: error.status, headers });
  console.error("MOBILE_ONBOARDING_FAILED", error);
  return NextResponse.json({ ok: false, error: { code: "ONBOARDING_FAILED", message: "Your registration could not be saved safely." } }, { status: 500, headers });
}

export async function GET(request: Request) {
  try { const auth = await authenticateMobileRequest(request); return NextResponse.json(mobileSuccess(await loadMobileOnboarding(auth.supabase, auth.user)), { headers }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body = await request.json();
    switch (body?.action) {
      case "declare_identity": await declareMobileIdentity(auth.supabase, auth.user, body.payload); break;
      case "save_profile": await saveMobileProfile(auth.supabase, auth.user, body.payload); break;
      case "save_business": await saveMobileBusiness(auth.supabase, auth.user, body.payload); break;
      case "verify_location": await verifyMobileLocation(auth.supabase, auth.user, body.payload); break;
      case "upload_evidence": { const asset = await uploadMobileEvidence(auth.supabase, auth.user, body.payload); await attachMobileEvidence(auth.supabase, auth.user, asset); break; }
      case "evaluate": await evaluateMobileRegistration(auth.supabase); break;
      default: throw new MobileOnboardingError(400, "INVALID_ACTION", "Choose a supported registration action.");
    }
    return NextResponse.json(mobileSuccess(await loadMobileOnboarding(auth.supabase, auth.user)), { headers });
  } catch (error) { return failure(error); }
}
