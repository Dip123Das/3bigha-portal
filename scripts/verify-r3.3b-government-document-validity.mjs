import fs from "node:fs";

const files = {
  validity:
    "lib/registration/legalProofValidity.ts",
  route:
    "app/api/ai/vendor-document-verify/route.ts",
  onboarding:
    "app/onboarding/business/BusinessOnboardingPageClient.tsx",
  panel:
    "components/onboarding/BusinessVerificationPanel.tsx",
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file}`);
  }
}

const validity = fs.readFileSync(files.validity, "utf8");
const route = fs.readFileSync(files.route, "utf8");
const onboarding = fs.readFileSync(
  files.onboarding,
  "utf8"
);
const panel = fs.readFileSync(files.panel, "utf8");

const assertions = [
  [
    validity.includes('"financial_period"'),
    "financial-period validity type exists",
  ],
  [
    validity.includes("Date.UTC(endYear, 2, 31"),
    "financial periods end on 31 March",
  ],
  [
    route.includes("extractedPeriodStartYear"),
    "AI extracts financial-period start year",
  ],
  [
    route.includes("extractedPeriodEndYear"),
    "AI extracts financial-period end year",
  ],
  [
    route.includes("financialPeriodsMatch"),
    "financial periods are compared canonically",
  ],
  [
    route.includes(
      "A financial period is not an exact expiry date"
    ),
    "AI is instructed not to invent an expiry date",
  ],
  [
    onboarding.includes(
      "periodStartYear"
    ) &&
      onboarding.includes(
        "periodEndYear"
      ),
    "onboarding persists financial-period metadata",
  ],
  [
    panel.includes(
      "Financial / assessment period"
    ),
    "human-first financial-period option is visible",
  ],
  [
    panel.includes(
      "selectedLegalKind"
    ),
    "only the selected legal-proof form is expanded",
  ],
  [
    panel.includes(
      "start year 2026 and end year 2029"
    ),
    "the Trade Licence example is explained",
  ],
  [
    !panel.includes(
      "This certificate has no expiry date"
    ),
    "legacy checkbox-only validity model was removed",
  ],
];

let failures = 0;

for (const [passed, label] of assertions) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${label}`);
  if (!passed) failures += 1;
}

if (failures) {
  console.error(
    `${failures} R3.3B assertion(s) failed.`
  );
  process.exit(1);
}

console.log(
  "R3.3B government-document validity assertions passed."
);
