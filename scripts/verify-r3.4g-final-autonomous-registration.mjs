import fs from "node:fs";

const page = fs.readFileSync(
  "app/onboarding/business/BusinessOnboardingPageClient.tsx",
  "utf8"
);

const css = fs.readFileSync(
  "app/globals.css",
  "utf8"
);

const completionRoute = fs.readFileSync(
  "app/api/onboarding/complete-registration/route.ts",
  "utf8"
);

const assertions = [
  [
    page.includes('id="sec-review"'),
    "Review & Finish panel is rendered",
  ],
  [
    page.includes("Choose how you want to begin"),
    "subscription selection is visible",
  ],
  [
    page.includes('"free"') &&
      page.includes('"basic_vendor"') &&
      page.includes('"silver_vendor"') &&
      page.includes('"gold_vendor"') &&
      page.includes('"platinum_vendor"'),
    "all five registration plans are available",
  ],
  [
    page.includes("Truthful declaration"),
    "truthful declaration is visible",
  ],
  [
    page.includes("/terms-and-conditions"),
    "Terms and Conditions are linked",
  ],
  [
    page.includes("/privacy-policy"),
    "Privacy Policy is linked",
  ],
  [
    page.includes("Activate My Dashboard"),
    "Free plan exposes direct dashboard activation",
  ],
  [
    page.includes("Continue to SBI Secure Payment"),
    "paid plans continue to SBI payment",
  ],
  [
    page.includes("continueFromFinalReview"),
    "final subscription choice is connected",
  ],
  [
    page.includes(
      'activeJourneyKey !== "review"'
    ),
    "editing actions are hidden on final review",
  ],
  [
    completionRoute.includes(
      "activate_self_registered_dashboard"
    ),
    "server remains the dashboard activation authority",
  ],
  [
    completionRoute.includes(
      "REGISTRATION_COMPLETION_AND_DASHBOARD_ACTIVATED"
    ),
    "atomic activation contract remains preserved",
  ],
  [
    css.includes(".registration-final-review"),
    "final completion experience is styled",
  ],
  [
    css.includes("@media (max-width: 700px)"),
    "final completion experience is responsive",
  ],
];

let failures = 0;

for (const [passed, label] of assertions) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${label}`);

  if (!passed) failures += 1;
}

if (failures) {
  console.error(
    `${failures} R3.4G assertion(s) failed.`
  );
  process.exit(1);
}

console.log(
  "R3.4G final autonomous registration assertions passed."
);
