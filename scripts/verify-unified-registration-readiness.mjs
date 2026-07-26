import fs from "node:fs";

const files = {
  engine: "lib/registration/resolveRegistrationReadiness.ts",
  onboarding:
    "app/onboarding/business/BusinessOnboardingPageClient.tsx",
  verification:
    "components/onboarding/BusinessVerificationPanel.tsx",
  status:
    "lib/registration/resolveRegistrationStatusPresentation.ts",
};

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`${name}: missing ${file}`);
  }
}

const engine = fs.readFileSync(files.engine, "utf8");
const onboarding = fs.readFileSync(files.onboarding, "utf8");
const verification = fs.readFileSync(files.verification, "utf8");
const status = fs.readFileSync(files.status, "utf8");

const assertions = [
  [
    engine.includes("resolveRegistrationReadiness"),
    "canonical readiness resolver exists",
  ],
  [
    engine.includes("evidenceCollectionProgress"),
    "evidence collection is explicitly separated",
  ],
  [
    engine.includes("businessProofStatus"),
    "business-proof decision is explicit",
  ],
  [
    engine.includes("registrationReady"),
    "canonical registration readiness is exposed",
  ],
  [
    onboarding.includes(
      'from "@/lib/registration/resolveRegistrationReadiness"'
    ),
    "onboarding imports canonical readiness",
  ],
  [
    onboarding.includes(
      "canonicalReadiness.registrationReady"
    ),
    "activation UI uses canonical registration readiness",
  ],
  [
    onboarding.includes(
      "canonicalReadiness.progressPercent"
    ),
    "registration progress uses canonical readiness",
  ],
  [
    verification.includes(
      "{verificationProgress}% evidence collected"
    ),
    "evidence percentage is truthfully labelled",
  ],
  [
    !verification.includes(
      "{verificationProgress}% complete"
    ),
    "misleading evidence-complete wording is removed",
  ],
  [
    verification.includes(
      "Evidence collection and business-proof verification are separate"
    ),
    "verification panel explains the two states",
  ],
  [
    status.includes(
      "Evidence collection and business-proof verification are shown separately"
    ),
    "status presentation separates collection and verification",
  ],
  [
    status.includes(
      "Business-proof verification is still in progress"
    ),
    "pending status truthfully describes verification",
  ],
];

let failed = 0;

for (const [passed, label] of assertions) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${label}`);
  if (!passed) failed += 1;
}

if (failed > 0) {
  console.error(
    `${failed} unified-readiness assertion(s) failed.`
  );
  process.exit(1);
}

console.log(
  "Unified registration readiness assertions passed."
);
