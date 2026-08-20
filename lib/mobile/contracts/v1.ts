import type { CanonicalCompletionState, CanonicalVerificationState } from "@/lib/identity/resolveCanonicalIdentity";

export const MOBILE_API_VERSION = "1" as const;
export const MOBILE_CONTRACT_VERSION = "2026-08-09" as const;

export type MobileDashboardKey =
  | "admin_home"
  | "blog_admin_home"
  | "banker_home"
  | "investor_home"
  | "vendor_home"
  | "publisher_home"
  | "buyer_home";

export type MobileRequiredAction =
  | "none"
  | "select_role"
  | "complete_basic_profile"
  | "complete_business_profile"
  | "complete_profile_setup"
  | "review_growth_plan"
  | "contact_support";

export type MobileApiErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_SESSION"
  | "CONFIGURATION_ERROR"
  | "BOOTSTRAP_FAILED";

export type MobileOnboardingPath = "customer" | "business" | "individual_professional";

export type MobileIdentityOption = {
  key: string;
  label: string;
  localLabel: string | null;
  family: string;
  description: string | null;
  requiresBusinessOnboarding: boolean;
  requiresVerification: boolean;
};

export type MobileEvidenceAsset = {
  id: string;
  bucket: "registration-evidence";
  path: string;
  /**
   * Registration evidence is private. Review UIs must request a short-lived
   * signed URL from an authorised server endpoint.
   */
  url: null;
  name: string;
  size: number;
  mimeType: string;
  sha256: string;
  kind: "image" | "document";
  captureSource: "live_camera" | "file_upload";
  captureTimestamp: string;
  serverReceivedAt: string;
  evidenceBindingSha256: string;
  captureMetadata: {
    latitude: number; longitude: number; accuracy: number;
    altitude: number | null; altitudeAccuracy: number | null;
    heading: number | null; speed: number | null;
    locationTimestamp: string; locationAgeMs: number; mocked: boolean | null;
    cameraOpenedAt: string; deviceCapturedAt: string; timezone: string;
    utcOffsetMinutes: number; platform: string; cameraFacing: "front" | "back";
  } | null;
  evidenceCategory: string;
};

export type MobileOnboardingState = {
  path: MobileOnboardingPath | null;
  identityOptions: MobileIdentityOption[];
  selectedIdentityKeys: string[];
  primaryIdentityKey: string | null;
  profile: { fullName: string; phone: string; state: string; district: string; pincode: string };
  business: {
    businessName: string;
    businessType: string;
    natureOfBusiness: string[];
    state: string;
    district: string;
    city: string;
    pincode: string;
    locationStatus: string;
    approvalStatus: string;
    registrationComplete: boolean;
  };
  evidence: {
    selfieCaptured: boolean;
    workPhotoCount: number;
    documentCount: number;
  };
  verification: { status: string; reasons: string[]; canActivateDashboard: boolean };
};

export type MobileApiSuccess<T> = {
  ok: true;
  apiVersion: typeof MOBILE_API_VERSION;
  contractVersion: typeof MOBILE_CONTRACT_VERSION;
  data: T;
};

export type MobileApiFailure = {
  ok: false;
  apiVersion: typeof MOBILE_API_VERSION;
  error: {
    code: MobileApiErrorCode;
    message: string;
    retryable: boolean;
  };
};

export type MobileBootstrap = {
  person: {
    id: string;
    email: string | null;
    displayName: string;
  };
  registration: {
    state: string;
    reason: string;
    completion: CanonicalCompletionState;
    requiredAction: MobileRequiredAction;
  };
  identity: {
    primaryRole: string;
    businessName: string;
    businessIdentityKeys: string[];
    individualIdentityKeys: string[];
    approvalStatus: string;
    verification: {
      human: CanonicalVerificationState;
      selfie: CanonicalVerificationState;
      business: CanonicalVerificationState;
    };
  };
  navigation: {
    primaryDashboard: MobileDashboardKey;
    primaryWebPath: string;
    unifiedWorkspacePath: string;
    items: Array<{ key: string; label: string; webPath: string }>;
  };
  capabilities: {
    legacy: string[];
    operating: string[];
    groups: Record<string, string[]>;
  };
};

export type MobileDashboardMetric = {
  key: string;
  label: string;
  value: number | null;
  webPath: string;
};

export type MobileDashboardAggregate = {
  dashboard: MobileDashboardKey;
  generatedAt: string;
  metrics: MobileDashboardMetric[];
};

export function mobileSuccess<T>(data: T): MobileApiSuccess<T> {
  return {
    ok: true,
    apiVersion: MOBILE_API_VERSION,
    contractVersion: MOBILE_CONTRACT_VERSION,
    data,
  };
}

export function mobileFailure(
  code: MobileApiErrorCode,
  message: string,
  retryable = false
): MobileApiFailure {
  return {
    ok: false,
    apiVersion: MOBILE_API_VERSION,
    error: { code, message, retryable },
  };
}
