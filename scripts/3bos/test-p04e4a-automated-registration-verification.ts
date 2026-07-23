import assert from "node:assert/strict";

import {
  resolveAutomatedRegistrationVerification,
  type AutomatedRegistrationVerificationInput,
} from "../../lib/registration/resolveAutomatedRegistrationVerification";

const verifiedInput: AutomatedRegistrationVerificationInput = {
  accountStatus: "active",
  currentVerificationStatus:
    "automated_verification_pending",
  currentDashboardStatus: "not_ready",

  role: "vendor",
  basicIdentityComplete: true,
  onboardingComplete: true,

  businessProfileRequired: true,
  businessProfileComplete: true,
  registrationComplete: true,

  locationRequired: true,
  locationVerificationStatus: "verified",
  exactAddressComplete: true,

  selfieRequired: true,
  selfieCaptureStatus: "verified",
  selfieEvidencePresent: true,

  workplaceEvidenceRequired: true,
  workplaceEvidenceStatus: "verified",
  workplaceEvidencePresent: true,

  documentEvidenceRequired: true,
  documentVerificationStatus: "verified_by_ai",
  documentVerificationConfidence: 92,

  securityRiskDetected: false,
};

const verified =
  resolveAutomatedRegistrationVerification(
    verifiedInput
  );

assert.equal(verified.status, "auto_verified");
assert.equal(verified.score, 100);
assert.equal(
  verified.approvalProjection,
  "approved"
);
assert.equal(
  verified.dashboardProjection,
  "ready"
);
assert.equal(
  verified.canActivateDashboard,
  true
);

const missingSelfie =
  resolveAutomatedRegistrationVerification({
    ...verifiedInput,
    selfieCaptureStatus: "captured",
    selfieEvidencePresent: true,
  });

assert.equal(
  missingSelfie.status,
  "evidence_incomplete"
);
assert.equal(
  missingSelfie.canActivateDashboard,
  false
);

const correction =
  resolveAutomatedRegistrationVerification({
    ...verifiedInput,
    documentVerificationStatus:
      "format_valid_document_mismatch",
    documentVerificationConfidence: 90,
  });

assert.equal(
  correction.status,
  "correction_required"
);
assert.equal(correction.correctionRequired, true);
assert.equal(
  correction.approvalProjection,
  "rejected"
);

const lowConfidence =
  resolveAutomatedRegistrationVerification({
    ...verifiedInput,
    documentVerificationStatus: "low_confidence",
    documentVerificationConfidence: 62,
  });

assert.equal(
  lowConfidence.status,
  "admin_review_required"
);
assert.equal(
  lowConfidence.requiresAdminReview,
  true
);

const securityRestricted =
  resolveAutomatedRegistrationVerification({
    ...verifiedInput,
    securityRiskDetected: true,
    securityRiskReasons: [
      "Evidence integrity check failed.",
    ],
  });

assert.equal(
  securityRestricted.status,
  "restricted"
);
assert.equal(securityRestricted.restricted, true);
assert.equal(
  securityRestricted.dashboardProjection,
  "suspended"
);

const buyerWithoutBusinessEvidence =
  resolveAutomatedRegistrationVerification({
    ...verifiedInput,
    role: "buyer",
    businessProfileRequired: false,
    businessProfileComplete: false,
    registrationComplete: false,
    selfieRequired: false,
    selfieCaptureStatus: "missing",
    selfieEvidencePresent: false,
    workplaceEvidenceRequired: false,
    workplaceEvidenceStatus: "not_required",
    workplaceEvidencePresent: false,
    documentEvidenceRequired: false,
    documentVerificationStatus: null,
    documentVerificationConfidence: null,
  });

assert.equal(
  buyerWithoutBusinessEvidence.status,
  "auto_verified"
);
assert.equal(
  buyerWithoutBusinessEvidence.canActivateDashboard,
  true
);

console.log(
  "P04-E4A automated verification behavior: 6/6 scenarios passed."
);
