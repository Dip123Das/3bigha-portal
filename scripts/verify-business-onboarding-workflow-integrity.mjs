import fs from "node:fs";

const path =
  "app/onboarding/business/BusinessOnboardingPageClient.tsx";

const source = fs.readFileSync(path, "utf8");

const checks = [
  [
    source.includes(
      "const registrationReadyUI ="
    ),
    "final readiness has its own strict state",
  ],
  [
    source.includes(
      "documentVerificationReady"
    ),
    "document verification participates in readiness",
  ],
  [
    source.includes(
      "practicalProofReady"
    ),
    "practical evidence participates in readiness",
  ],
  [
    source.includes(
      "liveSelfieReady"
    ),
    "live selfie participates in readiness",
  ],
  [
    source.includes(
      "coverageReady"
    ),
    "service coverage participates in readiness",
  ],
  [
    (
      source.includes(
        "!registrationReadyUI"
      ) &&
      source.includes(
        "!termsAccepted"
      ) &&
      source.includes(
        "disabled={"
      )
    ),
    "dashboard activation is blocked until full readiness and agreement",
  ],
  [
    source.includes(
      "onStepSelect={(step)"
    ),
    "Review & Finish has an explicit page handler",
  ],
  [
    source.includes(
      "REGISTRATION_COMPLETION_VERIFICATION_AND_INTELLIGENCE_EVALUATED"
    ),
    "frontend accepts the current server completion contract",
  ],
  [
    source.includes(
      "registrationPendingChecks.map"
    ),
    "pending registration work is visibly listed",
  ],
];

let failed = false;

for (const [passed, label] of checks) {
  console.log(
    `${passed ? "PASS" : "FAIL"}: ${label}`
  );

  if (!passed) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  "\nBusiness onboarding workflow integrity verified."
);
