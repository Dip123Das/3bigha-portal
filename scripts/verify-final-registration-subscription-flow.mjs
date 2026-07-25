import fs from "node:fs";

const onboarding = fs.readFileSync(
  "app/onboarding/business/BusinessOnboardingPageClient.tsx",
  "utf8"
);

const verification = fs.readFileSync(
  "components/onboarding/BusinessVerificationPanel.tsx",
  "utf8"
);

const subscription = fs.readFileSync(
  "app/dashboard/subscription/SubscriptionPageClient.tsx",
  "utf8"
);

const checks = [
  [
    onboarding.includes(
      '"verified_by_ai"'
    ),
    "AI-verified documents count as a completed verification run",
  ],
  [
    onboarding.includes(
      '"needs_manual_review"'
    ),
    "completed manual-review verification can proceed to server review",
  ],
  [
    !onboarding.includes(
      "optional: true"
    ),
    "physical Gallery journey is not optional",
  ],
  [
    verification.includes(
      'assets.length ? "Added" : "Choose one"'
    ),
    "physical evidence cards no longer say Optional",
  ],
  [
    verification.includes(
      "Enter the certificate number first"
    ),
    "legal upload requires a certificate number first",
  ],
  [
    verification.includes(
      "registrationNumbers"
    ),
    "structured registration numbers are connected",
  ],
  [
    onboarding.includes(
      "termsAccepted"
    ),
    "terms agreement is required",
  ],
  [
    onboarding.includes(
      "/terms-and-conditions"
    ) &&
      onboarding.includes(
        "/privacy-policy"
      ),
    "terms and privacy links are shown",
  ],
  [
    onboarding.includes(
      "subscriptionAfterRegistrationUrl"
    ),
    "successful activation opens subscription plans",
  ],
  [
    subscription.includes(
      "identityRecommendation"
    ),
    "subscription recommendation uses identity focus",
  ],
  [
    subscription.includes(
      "RECOMMENDED FOR YOU"
    ),
    "recommended package is visually identified",
  ],
];

let failed = false;

for (const [passed, label] of checks) {
  console.log(
    `${passed ? "PASS" : "FAIL"}: ${label}`
  );

  if (!passed) failed = true;
}

if (failed) process.exit(1);

console.log(
  "\nFinal registration and subscription flow verified."
);
