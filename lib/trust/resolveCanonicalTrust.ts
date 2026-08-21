import type {
  CanonicalTrustInput,
  CanonicalTrustLevel,
  CanonicalTrustModel,
  CanonicalTrustNextAction,
  CanonicalTrustReason,
  CanonicalTrustReasonCode,
  CanonicalTrustState,
} from "./types";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function lower(value: unknown): string {
  return clean(value).toLowerCase();
}

function bool(value: unknown): boolean {
  return value === true || lower(value) === "true";
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringOrNull(value: unknown): string | null {
  const normalized = clean(value);
  return normalized || null;
}

function isRegistrationVerified(status: string): boolean {
  return ["auto_verified", "admin_verified"].includes(status);
}

function resolveState(registrationStatus: string): CanonicalTrustState {
  switch (registrationStatus) {
    case "auto_verified":
    case "admin_verified":
      return "verified";
    case "automated_verification_pending":
    case "admin_review_required":
      return "under_review";
    case "correction_required":
    case "evidence_incomplete":
      return "correction_required";
    case "restricted":
      return "restricted";
    case "rejected":
      return "rejected";
    case "draft":
      return "in_progress";
    default:
      return "unverified";
  }
}

function resolveLevel(args: {
  state: CanonicalTrustState;
  approvalStatus: string;
  businessComplete: boolean;
}): CanonicalTrustLevel {
  if (args.state === "verified") return "verified";

  if (
    args.businessComplete &&
    ["approved", "active"].includes(args.approvalStatus)
  ) {
    return "established";
  }

  if (
    args.businessComplete ||
    ["approved", "active", "pending"].includes(args.approvalStatus)
  ) {
    return "basic";
  }

  return "none";
}

function reason(
  code: CanonicalTrustReasonCode,
  label: string,
  satisfied: boolean
): CanonicalTrustReason {
  return { code, label, satisfied };
}

function resolveNextAction(
  state: CanonicalTrustState,
  certificateActive: boolean
): CanonicalTrustNextAction {
  switch (state) {
    case "verified":
      return {
        key: "open_certificate",
        label: certificateActive
          ? "Open verification certificate"
          : "Issue verification certificate",
        href: "/dashboard/registration/certificate",
      };
    case "under_review":
      return {
        key: "await_review",
        label: "View registration status",
        href: "/dashboard/registration",
      };
    case "correction_required":
      return {
        key: "submit_correction",
        label: "Update requested information",
        href:
          "/onboarding/business?returnTo=%2Fdashboard%2Fregistration&registration=1",
      };
    case "restricted":
    case "rejected":
      return {
        key: "contact_support",
        label: "Contact support",
        href: "/support/new",
      };
    case "in_progress":
      return {
        key: "continue_registration",
        label: "Continue registration",
        href:
          "/onboarding/business?returnTo=%2Fdashboard%2Fregistration&registration=1",
      };
    default:
      return {
        key: "start_registration",
        label: "Start registration",
        href:
          "/onboarding/business?returnTo=%2Fdashboard%2Fregistration&registration=1",
      };
  }
}

export function resolveCanonicalTrust(
  input: CanonicalTrustInput
): CanonicalTrustModel {
  const profile = input.profile ?? {};
  const business = input.businessProfile ?? {};
  const professional = input.professionalProfile ?? {};
  const certificate = input.certificate ?? {};

  const registrationStatus = lower(
    profile.registration_verification_status
  );
  const approvalStatus = lower(profile.approval_status);
  const businessVerificationStatus = lower(
    business.business_verification_status ||
      business.verification_status ||
      business.approval_status
  );
  const locationVerificationStatus = lower(
    business.location_verification_status
  );
  const professionalVerificationStatus = lower(
    professional.verification_status
  );

  const businessComplete =
    bool(business.business_profile_complete) ||
    bool(business.is_complete) ||
    bool(business.registration_complete);

  const registrationVerified =
    isRegistrationVerified(registrationStatus);
  const professionalVerified =
    professionalVerificationStatus === "verified";
  const certificateStatus = lower(certificate.status);
  const certificateNumber = stringOrNull(
    certificate.certificate_number
  );
  const certificateActive =
    certificateStatus === "active" &&
    Boolean(certificateNumber);

  const state = resolveState(registrationStatus);
  const level = resolveLevel({
    state,
    approvalStatus,
    businessComplete,
  });

  const reasons: CanonicalTrustReason[] = [
    reason(
      registrationVerified
        ? "registration_verified"
        : state === "under_review"
          ? "registration_under_review"
          : state === "correction_required"
            ? "registration_correction_required"
            : state === "restricted"
              ? "registration_restricted"
              : state === "rejected"
                ? "registration_rejected"
                : state === "in_progress"
                  ? "registration_in_progress"
                  : "registration_not_started",
      registrationVerified
        ? "Registration verified"
        : state === "under_review"
          ? "Registration is under review"
          : state === "correction_required"
            ? "Registration needs correction"
            : state === "restricted"
              ? "Registration is restricted"
              : state === "rejected"
                ? "Registration was rejected"
                : state === "in_progress"
                  ? "Registration is in progress"
                  : "Registration has not started",
      registrationVerified
    ),
    reason(
      ["approved", "active"].includes(approvalStatus)
        ? "identity_approved"
        : "identity_pending",
      ["approved", "active"].includes(approvalStatus)
        ? "Identity approved"
        : "Identity approval pending",
      ["approved", "active"].includes(approvalStatus)
    ),
    reason(
      businessComplete
        ? "business_profile_complete"
        : "business_profile_incomplete",
      businessComplete
        ? "Business profile complete"
        : "Business profile incomplete",
      businessComplete
    ),
    reason(
      locationVerificationStatus === "verified"
        ? "business_location_verified"
        : "business_location_unverified",
      locationVerificationStatus === "verified"
        ? "Business location verified"
        : "Business location not verified",
      locationVerificationStatus === "verified"
    ),
    reason(
      professionalVerified
        ? "professional_verified"
        : "professional_pending",
      professionalVerified
        ? "Professional evidence verified"
        : "Professional verification pending",
      professionalVerified
    ),
    reason(
      certificateActive
        ? "certificate_active"
        : "certificate_unavailable",
      certificateActive
        ? "Verification certificate active"
        : "Verification certificate unavailable",
      certificateActive
    ),
  ];

  return {
    version: "reg-int-01a-v1",
    userId: clean(input.userId),
    subject: input.subject ?? "member",
    state,
    level,
    isVerified: registrationVerified,
    mayDisplayVerifiedBadge:
      registrationVerified &&
      !["restricted", "rejected"].includes(state),
    registrationStatus,
    approvalStatus,
    businessVerificationStatus,
    locationVerificationStatus,
    professionalVerificationStatus,
    verifiedAt: stringOrNull(
      profile.registration_verified_at
    ),
    score: numberOrNull(
      profile.registration_verification_score
    ),
    certificate: {
      available: Boolean(certificateNumber),
      active: certificateActive,
      certificateNumber,
      verificationHref:
        certificateActive && certificateNumber
          ? `/verify/registration/${encodeURIComponent(certificateNumber)}`
          : null,
      issuedAt: stringOrNull(certificate.issued_at),
    },
    reasons,
    missingRequirements: reasons
      .filter((item) => !item.satisfied)
      .map((item) => item.code),
    nextAction: resolveNextAction(
      state,
      certificateActive
    ),
  };
}
