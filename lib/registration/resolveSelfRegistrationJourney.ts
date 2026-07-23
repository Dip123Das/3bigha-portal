export type SelfRegistrationVerificationStatus =
  | "draft"
  | "evidence_incomplete"
  | "automated_verification_pending"
  | "correction_required"
  | "admin_review_required"
  | "auto_verified"
  | "admin_verified"
  | "restricted";

export type DashboardActivationStatus =
  | "not_ready"
  | "ready"
  | "active"
  | "suspended";

export type SelfRegistrationJourneyState =
  | "IDENTITY_REQUIRED"
  | "BUSINESS_PROFILE_REQUIRED"
  | "LOCATION_REQUIRED"
  | "ADDRESS_REQUIRED"
  | "SELFIE_REQUIRED"
  | "WORKPLACE_EVIDENCE_REQUIRED"
  | "DOCUMENT_EVIDENCE_REQUIRED"
  | "AUTOMATED_VERIFICATION_REQUIRED"
  | "CORRECTION_REQUIRED"
  | "ADMIN_REVIEW_REQUIRED"
  | "SECURITY_RESTRICTED"
  | "SUBSCRIPTION_REQUIRED"
  | "READY_TO_ACTIVATE"
  | "DASHBOARD_ACTIVE";

export type SelfRegistrationJourneyInput = {
  role?: string | null;
  accountStatus?: string | null;

  basicIdentityComplete: boolean;
  onboardingComplete: boolean;

  isBusinessRole: boolean;
  isPureBlogRole?: boolean;

  businessProfileComplete: boolean;
  registrationComplete: boolean;

  locationVerified: boolean;
  exactAddressComplete: boolean;

  selfieRequired: boolean;
  selfieStatus?: string | null;

  workplaceEvidenceRequired: boolean;
  workplaceEvidenceStatus?: string | null;

  documentEvidenceRequired: boolean;
  documentVerificationStatus?: string | null;
  documentVerificationConfidence?: number | null;

  registrationVerificationStatus?: string | null;
  dashboardActivationStatus?: string | null;

  paidSubscriptionRequired?: boolean;
  paidSubscriptionActive?: boolean;
};

export type SelfRegistrationJourneyResolution = {
  state: SelfRegistrationJourneyState;
  verificationStatus: SelfRegistrationVerificationStatus;
  dashboardStatus: DashboardActivationStatus;
  approvalProjection: "pending" | "approved" | "rejected";
  canActivateDashboard: boolean;
  canEnterDashboard: boolean;
  requiresAdminReview: boolean;
  correctionRequired: boolean;
  reasons: string[];
  nextAction: string;
};

const BLOCKED_ACCOUNT_STATES = new Set([
  "deactivated",
  "re_registration_required",
  "permanently_blocked",
]);

const VERIFIED_SELFIE_STATES = new Set([
  "captured",
  "verification_pending",
  "verified",
]);

const VERIFIED_WORKPLACE_STATES = new Set([
  "submitted",
  "verification_pending",
  "verified",
  "not_required",
]);

const DOCUMENT_VERIFIED_STATES = new Set([
  "verified_by_ai",
  "verified",
  "matched",
]);

const DOCUMENT_REVIEW_STATES = new Set([
  "needs_review",
  "admin_review_required",
  "low_confidence",
]);

const DOCUMENT_CORRECTION_STATES = new Set([
  "format_invalid",
  "format_valid_document_mismatch",
  "correction_required",
  "document_missing",
]);

function clean(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function normalizeVerificationStatus(
  value: string | null | undefined
): SelfRegistrationVerificationStatus {
  const normalized = clean(value);

  if (
    normalized === "draft" ||
    normalized === "evidence_incomplete" ||
    normalized === "automated_verification_pending" ||
    normalized === "correction_required" ||
    normalized === "admin_review_required" ||
    normalized === "auto_verified" ||
    normalized === "admin_verified" ||
    normalized === "restricted"
  ) {
    return normalized;
  }

  return "draft";
}

function normalizeDashboardStatus(
  value: string | null | undefined
): DashboardActivationStatus {
  const normalized = clean(value);

  if (
    normalized === "not_ready" ||
    normalized === "ready" ||
    normalized === "active" ||
    normalized === "suspended"
  ) {
    return normalized;
  }

  return "not_ready";
}

function resolution(
  state: SelfRegistrationJourneyState,
  verificationStatus: SelfRegistrationVerificationStatus,
  dashboardStatus: DashboardActivationStatus,
  reasons: string[],
  nextAction: string,
  options?: {
    approvalProjection?: "pending" | "approved" | "rejected";
    canActivateDashboard?: boolean;
    canEnterDashboard?: boolean;
    requiresAdminReview?: boolean;
    correctionRequired?: boolean;
  }
): SelfRegistrationJourneyResolution {
  return {
    state,
    verificationStatus,
    dashboardStatus,
    approvalProjection: options?.approvalProjection ?? "pending",
    canActivateDashboard: options?.canActivateDashboard ?? false,
    canEnterDashboard: options?.canEnterDashboard ?? false,
    requiresAdminReview: options?.requiresAdminReview ?? false,
    correctionRequired: options?.correctionRequired ?? false,
    reasons,
    nextAction,
  };
}

/**
 * Canonical self-registration journey resolver.
 *
 * Governing principles:
 * - Self-registration is the normal path.
 * - Automated verification is the normal decision path.
 * - Admin review is an exception path.
 * - Dashboard activation is a separate, server-validated action.
 * - Subscription must never substitute for identity verification.
 */
export function resolveSelfRegistrationJourney(
  input: SelfRegistrationJourneyInput
): SelfRegistrationJourneyResolution {
  const accountStatus = clean(input.accountStatus || "active");
  const verificationStatus = normalizeVerificationStatus(
    input.registrationVerificationStatus
  );
  const dashboardStatus = normalizeDashboardStatus(
    input.dashboardActivationStatus
  );

  if (BLOCKED_ACCOUNT_STATES.has(accountStatus)) {
    return resolution(
      "SECURITY_RESTRICTED",
      "restricted",
      "suspended",
      [`Account status is ${accountStatus}.`],
      "Contact support or complete the required account recovery process.",
      {
        approvalProjection: "rejected",
      }
    );
  }

  if (verificationStatus === "restricted") {
    return resolution(
      "SECURITY_RESTRICTED",
      "restricted",
      "suspended",
      ["The registration is restricted because a serious security issue requires investigation."],
      "Wait for administrator investigation or contact support.",
      {
        approvalProjection: "rejected",
      }
    );
  }

  if (dashboardStatus === "active") {
    return resolution(
      "DASHBOARD_ACTIVE",
      verificationStatus === "admin_verified"
        ? "admin_verified"
        : "auto_verified",
      "active",
      ["Registration is verified and the dashboard is active."],
      "Open the unified workspace.",
      {
        approvalProjection: "approved",
        canEnterDashboard: true,
      }
    );
  }

  if (!clean(input.role) || !input.basicIdentityComplete) {
    return resolution(
      "IDENTITY_REQUIRED",
      "evidence_incomplete",
      "not_ready",
      ["Basic identity, contact or declared role information is incomplete."],
      "Complete your identity and contact information."
    );
  }

  if (
    input.isBusinessRole &&
    (!input.businessProfileComplete || !input.registrationComplete)
  ) {
    return resolution(
      "BUSINESS_PROFILE_REQUIRED",
      "evidence_incomplete",
      "not_ready",
      ["The required business or professional profile is incomplete."],
      "Complete your business or professional details."
    );
  }

  if (!input.locationVerified) {
    return resolution(
      "LOCATION_REQUIRED",
      "evidence_incomplete",
      "not_ready",
      ["Device-assisted location verification is incomplete."],
      "Use your current location and verify the official LGD geography."
    );
  }

  if (!input.exactAddressComplete) {
    return resolution(
      "ADDRESS_REQUIRED",
      "evidence_incomplete",
      "not_ready",
      ["The exact human-readable address is incomplete."],
      "Complete the road, premises, locality, landmark and PIN-code details."
    );
  }

  const selfieStatus = clean(input.selfieStatus);

  if (
    input.selfieRequired &&
    !VERIFIED_SELFIE_STATES.has(selfieStatus)
  ) {
    return resolution(
      "SELFIE_REQUIRED",
      "evidence_incomplete",
      "not_ready",
      ["A live camera selfie is required for identity evidence."],
      "Capture a clear live selfie using your device camera."
    );
  }

  const workplaceStatus = clean(input.workplaceEvidenceStatus);

  if (
    input.workplaceEvidenceRequired &&
    !VERIFIED_WORKPLACE_STATES.has(workplaceStatus)
  ) {
    return resolution(
      "WORKPLACE_EVIDENCE_REQUIRED",
      "evidence_incomplete",
      "not_ready",
      ["Required workplace evidence has not been submitted."],
      "Upload clear photographs of the applicable shop, office, warehouse, factory, chamber or project site."
    );
  }

  const documentStatus = clean(input.documentVerificationStatus);
  const documentConfidence = Math.max(
    0,
    Math.min(100, Number(input.documentVerificationConfidence || 0))
  );

  if (
    input.documentEvidenceRequired &&
    DOCUMENT_CORRECTION_STATES.has(documentStatus)
  ) {
    return resolution(
      "CORRECTION_REQUIRED",
      "correction_required",
      "not_ready",
      ["The submitted registration document is invalid, unreadable or does not match the entered information."],
      "Correct the registration information or upload a clearer matching document.",
      {
        approvalProjection: "rejected",
        correctionRequired: true,
      }
    );
  }

  if (
    input.documentEvidenceRequired &&
    (
      DOCUMENT_REVIEW_STATES.has(documentStatus) ||
      (
        documentStatus &&
        !DOCUMENT_VERIFIED_STATES.has(documentStatus) &&
        documentConfidence > 0 &&
        documentConfidence < 70
      )
    )
  ) {
    return resolution(
      "ADMIN_REVIEW_REQUIRED",
      "admin_review_required",
      "not_ready",
      ["The submitted document could not be verified with sufficient confidence."],
      "Your registration has been sent to the administrator exception queue.",
      {
        requiresAdminReview: true,
      }
    );
  }

  if (
    input.documentEvidenceRequired &&
    !DOCUMENT_VERIFIED_STATES.has(documentStatus)
  ) {
    return resolution(
      "DOCUMENT_EVIDENCE_REQUIRED",
      "evidence_incomplete",
      "not_ready",
      ["Required business or professional document verification is incomplete."],
      "Run document verification after uploading the required evidence."
    );
  }

  if (verificationStatus === "correction_required") {
    return resolution(
      "CORRECTION_REQUIRED",
      "correction_required",
      "not_ready",
      ["Automated verification found information that the member can correct."],
      "Review the stated corrections and resubmit accurate evidence.",
      {
        approvalProjection: "rejected",
        correctionRequired: true,
      }
    );
  }

  if (verificationStatus === "admin_review_required") {
    return resolution(
      "ADMIN_REVIEW_REQUIRED",
      "admin_review_required",
      "not_ready",
      ["Automated verification found an exception requiring administrator review."],
      "Wait for the exception review or respond to any requested clarification.",
      {
        requiresAdminReview: true,
      }
    );
  }

  if (
    verificationStatus !== "auto_verified" &&
    verificationStatus !== "admin_verified"
  ) {
    return resolution(
      "AUTOMATED_VERIFICATION_REQUIRED",
      "automated_verification_pending",
      "not_ready",
      ["All required evidence is available, but the authoritative automated verification has not completed."],
      "Submit the completed registration for automated verification."
    );
  }

  if (
    input.paidSubscriptionRequired === true &&
    input.paidSubscriptionActive !== true
  ) {
    return resolution(
      "SUBSCRIPTION_REQUIRED",
      verificationStatus,
      "not_ready",
      ["The selected entitlement requires an active paid subscription."],
      "Complete the verified payment for the selected Growth Plan.",
      {
        approvalProjection: "approved",
      }
    );
  }

  return resolution(
    "READY_TO_ACTIVATE",
    verificationStatus,
    "ready",
    ["Registration and all applicable evidence requirements are verified."],
    "Activate My Dashboard.",
    {
      approvalProjection: "approved",
      canActivateDashboard: true,
    }
  );
}
