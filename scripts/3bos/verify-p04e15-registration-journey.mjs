import fs from "node:fs";

const resolverPath =
  "lib/registration/resolveSelfRegistrationJourney.ts";

const source = fs.readFileSync(resolverPath, "utf8");

const checks = [
  ["resolver exists", fs.existsSync(resolverPath)],
  [
    "canonical resolver exported",
    source.includes("export function resolveSelfRegistrationJourney"),
  ],
  [
    "identity required state",
    source.includes('"IDENTITY_REQUIRED"'),
  ],
  [
    "business profile required state",
    source.includes('"BUSINESS_PROFILE_REQUIRED"'),
  ],
  [
    "location required state",
    source.includes('"LOCATION_REQUIRED"'),
  ],
  [
    "exact address required state",
    source.includes('"ADDRESS_REQUIRED"'),
  ],
  [
    "live selfie required state",
    source.includes('"SELFIE_REQUIRED"'),
  ],
  [
    "workplace evidence required state",
    source.includes('"WORKPLACE_EVIDENCE_REQUIRED"'),
  ],
  [
    "document evidence required state",
    source.includes('"DOCUMENT_EVIDENCE_REQUIRED"'),
  ],
  [
    "automated verification state",
    source.includes('"AUTOMATED_VERIFICATION_REQUIRED"'),
  ],
  [
    "correction state",
    source.includes('"CORRECTION_REQUIRED"'),
  ],
  [
    "admin review exception state",
    source.includes('"ADMIN_REVIEW_REQUIRED"'),
  ],
  [
    "security restriction state",
    source.includes('"SECURITY_RESTRICTED"'),
  ],
  [
    "subscription is separate",
    source.includes('"SUBSCRIPTION_REQUIRED"'),
  ],
  [
    "ready to activate state",
    source.includes('"READY_TO_ACTIVATE"'),
  ],
  [
    "dashboard active state",
    source.includes('"DASHBOARD_ACTIVE"'),
  ],
  [
    "approval compatibility projection",
    source.includes("approvalProjection"),
  ],
  [
    "admin review is exception",
    source.includes("Admin review is an exception path"),
  ],
  [
    "subscription cannot replace identity verification",
    source.includes(
      "Subscription must never substitute for identity verification"
    ),
  ],
  [
    "server activation capability represented",
    source.includes("canActivateDashboard"),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(
  `\nP04-E1.5 canonical registration journey: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) process.exit(1);
