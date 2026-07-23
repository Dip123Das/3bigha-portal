export type AutomatedRegistrationVerificationStatus =
  | "evidence_incomplete"
  | "correction_required"
  | "admin_review_required"
  | "auto_verified"
  | "restricted";

export type AutomatedRegistrationApprovalProjection =
  | "pending"
  | "approved"
  | "rejected";

export type AutomatedRegistrationDashboardProjection =
  | "not_ready"
  | "ready"
  | "active"
  | "suspended";

export type AutomatedRegistrationVerificationInput = {
  accountStatus?: string | null;
  currentVerificationStatus?: string | null;
  currentDashboardStatus?: string | null;

  role?: string | null;
  basicIdentityComplete: boolean;
  onboardingComplete: boolean;

  businessProfileRequired: boolean;
  businessProfileComplete: boolean;
  registrationComplete: boolean;

  locationRequired: boolean;
  locationVerificationStatus?: string | null;
  exactAddressComplete: boolean;

  selfieRequired: boolean;
  selfieCaptureStatus?: string | null;
  selfieEvidencePresent?: boolean;

  workplaceEvidenceRequired: boolean;
  workplaceEvidenceStatus?: string | null;
  workplaceEvidencePresent?: boolean;

  documentEvidenceRequired: boolean;
  documentVerificationStatus?: string | null;
  documentVerificationConfidence?: number | null;

  securityRiskDetected?: boolean;
  securityRiskReasons?: string[] | null;
};

export type AutomatedRegistrationVerificationResolution = {
  status: AutomatedRegistrationVerificationStatus;
  score: number;
  approvalProjection: AutomatedRegistrationApprovalProjection;
  dashboardProjection: AutomatedRegistrationDashboardProjection;

  canActivateDashboard: boolean;
  requiresAdminReview: boolean;
  correctionRequired: boolean;
  restricted: boolean;

  reasons: string[];
  evidenceSnapshot: {
    identityComplete: boolean;
    onboardingComplete: boolean;
    businessProfileComplete: boolean;
    registrationComplete: boolean;
    locationVerified: boolean;
    exactAddressComplete: boolean;
    selfieVerified: boolean;
    workplaceVerified: boolean;
    documentVerified: boolean;
    documentConfidence: number;
    securityRiskDetected: boolean;
  };

  decisionSource: "automated_registration_verification_v1";
};

const BLOCKED_ACCOUNT_STATES = new Set([
  "deactivated",
  "re_registration_required",
  "permanently_blocked",
]);

const VERIFIED_LOCATION_STATES = new Set([
  "verified",
]);

const VERIFIED_SELFIE_STATES = new Set([
  "verified",
]);

const SELFIE_CORRECTION_STATES = new Set([
  "correction_required",
]);

const SELFIE_REVIEW_STATES = new Set([
  "admin_review_required",
]);

const VERIFIED_WORKPLACE_STATES = new Set([
  "verified",
  "not_required",
]);

const WORKPLACE_CORRECTION_STATES = new Set([
  "correction_required",
]);

const WORKPLACE_REVIEW_STATES = new Set([
  "admin_review_required",
]);

const VERIFIED_DOCUMENT_STATES = new Set([
  "verified_by_ai",
  "verified",
  "matched",
]);

const DOCUMENT_CORRECTION_STATES = new Set([
  "format_invalid",
  "format_valid_document_mismatch",
  "correction_required",
  "document_missing",
  "unreadable",
]);

const DOCUMENT_REVIEW_STATES = new Set([
  "needs_review",
  "admin_review_required",
  "low_confidence",
]);

function clean(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cleanReasons(
  reasons: string[] | null | undefined
): string[] {
  return Array.from(
    new Set(
      (reasons || [])
        .map((reason) => String(reason || "").trim())
        .filter(Boolean)
    )
  );
}

function buildResolution(
  status: AutomatedRegistrationVerificationStatus,
  score: number,
  reasons: string[],
  evidenceSnapshot:
    AutomatedRegistrationVerificationResolution["evidenceSnapshot"],
  options?: {
    approvalProjection?: AutomatedRegistrationApprovalProjection;
    dashboardProjection?: AutomatedRegistrationDashboardProjection;
    canActivateDashboard?: boolean;
    requiresAdminReview?: boolean;
    correctionRequired?: boolean;
    restricted?: boolean;
  }
): AutomatedRegistrationVerificationResolution {
  return {
    status,
    score: clampScore(score),
    approvalProjection:
      options?.approvalProjection ?? "pending",
    dashboardProjection:
      options?.dashboardProjection ?? "not_ready",
    canActivateDashboard:
      options?.canActivateDashboard ?? false,
    requiresAdminReview:
      options?.requiresAdminReview ?? false,
    correctionRequired:
      options?.correctionRequired ?? false,
    restricted:
      options?.restricted ?? false,
    reasons: cleanReasons(reasons),
    evidenceSnapshot,
    decisionSource:
      "automated_registration_verification_v1",
  };
}

/**
 * Pure automated self-registration verification resolver.
 *
 * Governing rules:
 * - It consumes stored evidence facts only.
 * - Browser-supplied approval or activation decisions are not inputs.
 * - Explicit security concerns take precedence over all other outcomes.
 * - Explicit correction evidence takes precedence over review.
 * - Ambiguous evidence is sent to exceptional admin review.
 * - Automatic verification requires every applicable evidence item to
 *   be authoritatively verified.
 * - Successful verification makes the dashboard ready; a separate
 *   atomic server function performs final dashboard activation.
 */
export function resolveAutomatedRegistrationVerification(
  input: AutomatedRegistrationVerificationInput
): AutomatedRegistrationVerificationResolution {
  const accountStatus = clean(
    input.accountStatus || "active"
  );

  const currentVerificationStatus = clean(
    input.currentVerificationStatus
  );

  const currentDashboardStatus = clean(
    input.currentDashboardStatus
  );

  const rolePresent = Boolean(clean(input.role));

  const locationStatus = clean(
    input.locationVerificationStatus
  );

  const selfieStatus = clean(
    input.selfieCaptureStatus
  );

  const workplaceStatus = clean(
    input.workplaceEvidenceStatus
  );

  const documentStatus = clean(
    input.documentVerificationStatus
  );

  const documentConfidence = clampScore(
    Number(input.documentVerificationConfidence || 0)
  );

  const locationVerified =
    !input.locationRequired ||
    VERIFIED_LOCATION_STATES.has(locationStatus);

  const selfieVerified =
    !input.selfieRequired ||
    (
      VERIFIED_SELFIE_STATES.has(selfieStatus) &&
      input.selfieEvidencePresent === true
    );

  const workplaceVerified =
    !input.workplaceEvidenceRequired ||
    (
      VERIFIED_WORKPLACE_STATES.has(workplaceStatus) &&
      (
        workplaceStatus === "not_required" ||
        input.workplaceEvidencePresent === true
      )
    );

  const documentVerified =
    !input.documentEvidenceRequired ||
    (
      VERIFIED_DOCUMENT_STATES.has(documentStatus) &&
      documentConfidence >= 85
    );

  const evidenceSnapshot = {
    identityComplete:
      rolePresent && input.basicIdentityComplete,
    onboardingComplete:
      input.onboardingComplete,
    businessProfileComplete:
      !input.businessProfileRequired ||
      input.businessProfileComplete,
    registrationComplete:
      !input.businessProfileRequired ||
      input.registrationComplete,
    locationVerified,
    exactAddressComplete:
      !input.locationRequired ||
      input.exactAddressComplete,
    selfieVerified,
    workplaceVerified,
    documentVerified,
    documentConfidence,
    securityRiskDetected:
      input.securityRiskDetected === true,
  };

  const securityReasons = cleanReasons(
    input.securityRiskReasons
  );

  if (
    BLOCKED_ACCOUNT_STATES.has(accountStatus) ||
    currentVerificationStatus === "restricted" ||
    currentDashboardStatus === "suspended" ||
    input.securityRiskDetected === true
  ) {
    return buildResolution(
      "restricted",
      0,
      [
        ...securityReasons,
        BLOCKED_ACCOUNT_STATES.has(accountStatus)
          ? `Account status is ${accountStatus}.`
          : "",
        currentVerificationStatus === "restricted"
          ? "Registration is already security restricted."
          : "",
        currentDashboardStatus === "suspended"
          ? "Dashboard access is suspended."
          : "",
        input.securityRiskDetected === true &&
        securityReasons.length === 0
          ? "A serious registration security concern was detected."
          : "",
      ],
      evidenceSnapshot,
      {
        approvalProjection: "rejected",
        dashboardProjection: "suspended",
        restricted: true,
      }
    );
  }

  const correctionReasons: string[] = [];

  if (SELFIE_CORRECTION_STATES.has(selfieStatus)) {
    correctionReasons.push(
      "The live selfie requires correction."
    );
  }

  if (
    WORKPLACE_CORRECTION_STATES.has(workplaceStatus)
  ) {
    correctionReasons.push(
      "The workplace evidence requires correction."
    );
  }

  if (
    DOCUMENT_CORRECTION_STATES.has(documentStatus)
  ) {
    correctionReasons.push(
      "The registration document is invalid, unreadable or does not match the entered information."
    );
  }

  if (
    currentVerificationStatus === "correction_required"
  ) {
    correctionReasons.push(
      "The registration already has an unresolved correction requirement."
    );
  }

  if (correctionReasons.length > 0) {
    return buildResolution(
      "correction_required",
      25,
      correctionReasons,
      evidenceSnapshot,
      {
        approvalProjection: "rejected",
        correctionRequired: true,
      }
    );
  }

  const reviewReasons: string[] = [];

  if (SELFIE_REVIEW_STATES.has(selfieStatus)) {
    reviewReasons.push(
      "The live selfie requires exceptional administrator review."
    );
  }

  if (WORKPLACE_REVIEW_STATES.has(workplaceStatus)) {
    reviewReasons.push(
      "The workplace evidence requires exceptional administrator review."
    );
  }

  if (DOCUMENT_REVIEW_STATES.has(documentStatus)) {
    reviewReasons.push(
      "The registration document requires exceptional administrator review."
    );
  }

  if (
    input.documentEvidenceRequired &&
    documentStatus &&
    !VERIFIED_DOCUMENT_STATES.has(documentStatus) &&
    !DOCUMENT_CORRECTION_STATES.has(documentStatus) &&
    documentConfidence > 0 &&
    documentConfidence < 85
  ) {
    reviewReasons.push(
      "The document verification confidence is below the automatic verification threshold."
    );
  }

  if (
    currentVerificationStatus ===
    "admin_review_required"
  ) {
    reviewReasons.push(
      "The registration already awaits exceptional administrator review."
    );
  }

  if (reviewReasons.length > 0) {
    return buildResolution(
      "admin_review_required",
      Math.max(40, documentConfidence),
      reviewReasons,
      evidenceSnapshot,
      {
        requiresAdminReview: true,
      }
    );
  }

  const incompleteReasons: string[] = [];

  if (!rolePresent || !input.basicIdentityComplete) {
    incompleteReasons.push(
      "Basic identity or declared role information is incomplete."
    );
  }

  if (!input.onboardingComplete) {
    incompleteReasons.push(
      "The canonical onboarding journey is incomplete."
    );
  }

  if (
    input.businessProfileRequired &&
    !input.businessProfileComplete
  ) {
    incompleteReasons.push(
      "The required business or professional profile is incomplete."
    );
  }

  if (
    input.businessProfileRequired &&
    !input.registrationComplete
  ) {
    incompleteReasons.push(
      "Server-owned registration completion has not been confirmed."
    );
  }

  if (!locationVerified) {
    incompleteReasons.push(
      "The official live location has not been verified."
    );
  }

  if (
    input.locationRequired &&
    !input.exactAddressComplete
  ) {
    incompleteReasons.push(
      "The exact human-readable address is incomplete."
    );
  }

  if (!selfieVerified) {
    incompleteReasons.push(
      "A verified live selfie with stored evidence is required."
    );
  }

  if (!workplaceVerified) {
    incompleteReasons.push(
      "Verified workplace evidence is required."
    );
  }

  if (!documentVerified) {
    incompleteReasons.push(
      "A matching registration document with sufficient verification confidence is required."
    );
  }

  if (incompleteReasons.length > 0) {
    const completedEvidenceCount =
      Object.values(evidenceSnapshot)
        .filter((value) => value === true)
        .length;

    const totalEvidenceCount =
      Object.values(evidenceSnapshot)
        .filter((value) => typeof value === "boolean")
        .length;

    const incompleteScore =
      totalEvidenceCount > 0
        ? Math.round(
            (completedEvidenceCount /
              totalEvidenceCount) *
              80
          )
        : 0;

    return buildResolution(
      "evidence_incomplete",
      incompleteScore,
      incompleteReasons,
      evidenceSnapshot
    );
  }

  return buildResolution(
    "auto_verified",
    100,
    [
      "All applicable identity, registration, location and evidence requirements were authoritatively verified.",
    ],
    evidenceSnapshot,
    {
      approvalProjection: "approved",
      dashboardProjection: "ready",
      canActivateDashboard: true,
    }
  );
}
