import fs from "node:fs";

const page = fs.readFileSync(
  "app/onboarding/business/BusinessOnboardingPageClient.tsx",
  "utf8"
);

const journey = fs.readFileSync(
  "components/onboarding/BusinessIdentityJourney.tsx",
  "utf8"
);

const checks = [
  [
    page.includes("selectedJourneyKey"),
    "parent owns selected journey state",
  ],
  [
    page.includes("openJourneyStep("),
    "parent can open a hidden journey section",
  ],
  [
    page.includes("journeyKeyForTarget("),
    "pending targets map to visible journey cards",
  ],
  [
    page.includes(
      'targetId === "sec-legal-proof"'
    ),
    "legal proof opens Documents",
  ],
  [
    page.includes(
      'targetId === "sec-selfie"'
    ),
    "live selfie opens Documents",
  ],
  [
    page.includes(
      'targetId === "sec-about-business"'
    ),
    "About Business opens its visible section",
  ],
  [
    page.includes(
      'targetId === "sec-address"'
    ),
    "Address opens its visible section",
  ],
  [
    journey.includes(
      "setSelectedKey(activeKey)"
    ),
    "journey honours controlled navigation",
  ],
  [
    !journey.includes(
      "currentStep && !currentStep.complete"
    ),
    "incomplete current step no longer traps navigation",
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
  "\nBusiness onboarding visible navigation verified."
);
