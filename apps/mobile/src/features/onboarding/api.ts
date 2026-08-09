import type { Session } from "@supabase/supabase-js";

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

function baseUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!value) throw new Error("The approved 3Bigha API URL is not configured.");
  return value;
}

async function decode(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.error?.message || "Registration could not be loaded.");
  return body.data as MobileOnboardingState;
}

export async function loadOnboarding(session: Session) {
  return decode(await fetch(`${baseUrl()}/api/v1/mobile/onboarding`, { headers: { Authorization: `Bearer ${session.access_token}` } }));
}

export async function performOnboardingAction(session: Session, action: string, payload: Record<string, unknown> = {}) {
  return decode(await fetch(`${baseUrl()}/api/v1/mobile/onboarding`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }));
}
