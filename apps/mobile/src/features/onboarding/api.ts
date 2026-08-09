import type { Session } from "@supabase/supabase-js";
import { mobileApiRequest } from "@/lib/api/request";

export type MobileOnboardingPath = "customer" | "business" | "individual_professional";
export type MobileOnboardingState = {
  path: MobileOnboardingPath | null;
  identityOptions: Array<{ key: string; label: string; localLabel: string | null; family: string; description: string | null; requiresBusinessOnboarding: boolean; requiresVerification: boolean }>;
  selectedIdentityKeys: string[];
  primaryIdentityKey: string | null;
  profile: { fullName: string; phone: string; state: string; district: string; pincode: string };
  business: { businessName: string; businessType: string; natureOfBusiness: string[]; state: string; district: string; city: string; pincode: string; locationStatus: string; approvalStatus: string; registrationComplete: boolean };
  evidence: { selfieCaptured: boolean; workPhotoCount: number; documentCount: number };
  verification: { status: string; reasons: string[]; canActivateDashboard: boolean };
};

export async function loadOnboarding(session: Session) {
  return mobileApiRequest<MobileOnboardingState>(session, "/api/v1/mobile/onboarding", {}, "Registration could not be loaded.");
}

export async function performOnboardingAction(session: Session, action: string, payload: Record<string, unknown> = {}) {
  return mobileApiRequest<MobileOnboardingState>(session, "/api/v1/mobile/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }, "Registration could not be updated.");
}
