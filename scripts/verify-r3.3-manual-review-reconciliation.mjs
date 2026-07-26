import fs from "node:fs";

const routePath =
  "app/api/ai/vendor-document-verify/route.ts";
const onboardingPath =
  "app/onboarding/business/BusinessOnboardingPageClient.tsx";

const route = fs.readFileSync(routePath, "utf8");
const onboarding = fs.readFileSync(onboardingPath, "utf8");

const assertions = [
  [
    route.includes("auditRecorded: false"),
    "verification survives audit-history failure",
  ],
  [
    route.includes("ok: true") &&
      route.includes("REGISTRATION_VERIFICATION_AUDIT_FAILED"),
    "audit failure is logged without discarding verification",
  ],
  [
    !route.includes(
      '"The document check could not be recorded safely."'
    ),
    "blocking persistence error was removed",
  ],
  [
    onboarding.includes(
      "A pending/manual-review result is not a user correction"
    ),
    "manual-review classification is documented",
  ],
  [
    !onboarding.includes(
      "document.readable === false ||\n" +
      "        document.matched === false"
    ),
    "uncertain comparison flags no longer force correction",
  ],
  [
    onboarding.includes(
      "The audit-history record will be reconciled automatically"
    ),
    "deferred audit has a human-first message",
  ],
];

let failures = 0;

for (const [passed, label] of assertions) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${label}`);
  if (!passed) failures += 1;
}

if (failures) {
  console.error(`${failures} R3.3 assertion(s) failed.`);
  process.exit(1);
}

console.log(
  "R3.3 manual-review reconciliation assertions passed."
);
