export type RegistrationState =
  | "MASTER_ADMIN"
  | "ACCOUNT_BLOCKED"
  | "ROLE_SELECTION_REQUIRED"
  | "BASIC_PROFILE_REQUIRED"
  | "BUSINESS_PROFILE_REQUIRED"
  | "PROFILE_SETUP_REQUIRED"
  | "BUSINESS_PROGRESSIVE_READY"
  | "GROWTH_PLAN_REQUIRED"
  | "ESSENTIAL_ACTIVE"
  | "READY";

export type RegistrationStateInput = {
  role?: string | null;
  accountStatus?: string | null;
  basicComplete: boolean;
  onboardingReady: boolean;
  isBusinessRole: boolean;
  hasVendorCapabilities: boolean;
  businessProfileComplete: boolean;
  registrationComplete: boolean;
  locationVerified: boolean;
  eligibleFree?: boolean | null;
};

export type RegistrationStateResolution = {
  state: RegistrationState;
  reason: string;
};

const BLOCKED_ACCOUNT_STATES = new Set([
  "deactivated",
  "re_registration_required",
  "permanently_blocked",
]);

function normalize(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Canonical post-login registration-state resolver.
 *
 * This function is deliberately pure:
 * - it does not query the database;
 * - it does not mutate profiles;
 * - it does not redirect;
 * - it only translates authoritative account facts into one state.
 */
export function resolveRegistrationState(
  input: RegistrationStateInput
): RegistrationStateResolution {
  const role = normalize(input.role);
  const accountStatus = normalize(input.accountStatus || "active");

  if (role === "master_admin") {
    return {
      state: "MASTER_ADMIN",
      reason: "Master Admin uses the protected administrative workspace.",
    };
  }

  if (BLOCKED_ACCOUNT_STATES.has(accountStatus)) {
    return {
      state: "ACCOUNT_BLOCKED",
      reason: `Account status is ${accountStatus}.`,
    };
  }

  if (!role) {
    return {
      state: "ROLE_SELECTION_REQUIRED",
      reason: "No declared or permitted role is available.",
    };
  }

  if (!input.basicComplete) {
    return {
      state: "BASIC_PROFILE_REQUIRED",
      reason: "Basic identity, contact or location information is incomplete.",
    };
  }

  if (!input.onboardingReady) {
    if (!input.isBusinessRole) {
      return {
        state: "PROFILE_SETUP_REQUIRED",
        reason: "The member profile has not completed the current onboarding contract.",
      };
    }

    const progressiveBusinessReady =
      input.hasVendorCapabilities ||
      input.businessProfileComplete ||
      input.registrationComplete;

    if (!progressiveBusinessReady) {
      return {
        state: "BUSINESS_PROFILE_REQUIRED",
        reason: "A business identity exists but no usable business capability has been configured.",
      };
    }

    return {
      state: "BUSINESS_PROGRESSIVE_READY",
      reason: "Business capabilities exist and progressive workspace entry is permitted.",
    };
  }

  if (input.isBusinessRole) {
    if (!input.locationVerified) {
      return {
        state: "ESSENTIAL_ACTIVE",
        reason: "Progressive Essential Workspace access is available while location verification remains incomplete.",
      };
    }

    if (input.eligibleFree !== true) {
      return {
        state: "GROWTH_PLAN_REQUIRED",
        reason: "The verified location is outside the current district-free entitlement.",
      };
    }

    return {
      state: "ESSENTIAL_ACTIVE",
      reason: "The member qualifies for the Essential Workspace.",
    };
  }

  return {
    state: "READY",
    reason: "Registration and access prerequisites are satisfied.",
  };
}
