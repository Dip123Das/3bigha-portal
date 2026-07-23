import fs from "node:fs";

const path =
  "lib/registration/resolveAutomatedRegistrationVerification.ts";

const source = fs.existsSync(path)
  ? fs.readFileSync(path, "utf8")
  : "";

const checks = [
  ["resolver exists", fs.existsSync(path)],
  [
    "resolver is exported",
    source.includes(
      "export function resolveAutomatedRegistrationVerification"
    ),
  ],
  [
    "resolver is pure",
    !source.includes("supabase") &&
      !source.includes("fetch(") &&
      !source.includes("cookies("),
  ],
  [
    "canonical automated statuses exist",
    source.includes('"evidence_incomplete"') &&
      source.includes('"correction_required"') &&
      source.includes('"admin_review_required"') &&
      source.includes('"auto_verified"') &&
      source.includes('"restricted"'),
  ],
  [
    "blocked accounts are restricted",
    source.includes("BLOCKED_ACCOUNT_STATES"),
  ],
  [
    "security risk takes precedence",
    source.includes("securityRiskDetected") &&
      source.indexOf('buildResolution(\n      "restricted"') <
        source.indexOf(
          'buildResolution(\n      "correction_required"'
        ),
  ],
  [
    "restricted projection rejects approval",
    source.includes(
      'approvalProjection: "rejected"'
    ),
  ],
  [
    "restricted projection suspends dashboard",
    source.includes(
      'dashboardProjection: "suspended"'
    ),
  ],
  [
    "correction states are explicit",
    source.includes("DOCUMENT_CORRECTION_STATES") &&
      source.includes("SELFIE_CORRECTION_STATES") &&
      source.includes(
        "WORKPLACE_CORRECTION_STATES"
      ),
  ],
  [
    "correction precedes admin review",
    source.indexOf(
      'buildResolution(\n      "correction_required"'
    ) <
      source.indexOf(
        'buildResolution(\n      "admin_review_required"'
      ),
  ],
  [
    "admin review remains exceptional",
    source.includes(
      "requiresAdminReview: true"
    ),
  ],
  [
    "identity completeness is required",
    source.includes("basicIdentityComplete"),
  ],
  [
    "onboarding completion is required",
    source.includes("onboardingComplete"),
  ],
  [
    "business completion is conditional",
    source.includes("businessProfileRequired") &&
      source.includes("businessProfileComplete") &&
      source.includes("registrationComplete"),
  ],
  [
    "verified location is required when applicable",
    source.includes("VERIFIED_LOCATION_STATES"),
  ],
  [
    "exact address is required when applicable",
    source.includes("exactAddressComplete"),
  ],
  [
    "verified selfie requires stored evidence",
    source.includes("VERIFIED_SELFIE_STATES") &&
      source.includes(
        "selfieEvidencePresent === true"
      ),
  ],
  [
    "verified workplace requires stored evidence",
    source.includes("VERIFIED_WORKPLACE_STATES") &&
      source.includes(
        "workplaceEvidencePresent === true"
      ),
  ],
  [
    "document statuses are allowlisted",
    source.includes("VERIFIED_DOCUMENT_STATES"),
  ],
  [
    "document confidence is clamped",
    source.includes("clampScore"),
  ],
  [
    "automatic document threshold is conservative",
    source.includes("documentConfidence >= 85"),
  ],
  [
    "low-confidence evidence requires review",
    source.includes("documentConfidence < 85"),
  ],
  [
    "automatic verification requires all evidence",
    source.includes(
      'buildResolution(\n    "auto_verified"'
    ),
  ],
  [
    "automatic verification projects approval",
    source.includes(
      'approvalProjection: "approved"'
    ),
  ],
  [
    "automatic verification only makes dashboard ready",
    source.includes(
      'dashboardProjection: "ready"'
    ),
  ],
  [
    "database activation remains separate",
    source.includes(
      "separate atomic server function"
    ) &&
      source.includes(
        "final dashboard activation"
      ) &&
      source.includes(
        'dashboardProjection: "ready"'
      ) &&
      !source.includes(
        'dashboardProjection: "active"'
      ),
  ],
  [
    "browser decisions are not accepted",
    !source.includes("requestedApproval") &&
      !source.includes("requestedActivation") &&
      !source.includes("clientDecision"),
  ],
  [
    "decision source is versioned",
    source.includes(
      '"automated_registration_verification_v1"'
    ),
  ],
  [
    "evidence snapshot is produced",
    source.includes("evidenceSnapshot"),
  ],
  [
    "reasons are deduplicated",
    source.includes("new Set"),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);

  if (!passed) {
    failures += 1;
  }
}

console.log(
  `\nP04-E4A automated registration verification: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) {
  process.exit(1);
}
