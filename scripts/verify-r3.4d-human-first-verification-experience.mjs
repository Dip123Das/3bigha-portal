import fs from "node:fs";

const page = fs.readFileSync(
  "app/onboarding/business/BusinessOnboardingPageClient.tsx",
  "utf8"
);

const rail = fs.readFileSync(
  "components/onboarding/BusinessRegistrationStatusRail.tsx",
  "utf8"
);

const verification = fs.readFileSync(
  "components/onboarding/BusinessVerificationPanel.tsx",
  "utf8"
);

const uploader = fs.readFileSync(
  "app/components/media/UniversalMediaUploader.tsx",
  "utf8"
);

const css = fs.readFileSync(
  "app/globals.css",
  "utf8"
);

const assertions = [
  [
    page.includes("registration-page-shell"),
    "onboarding uses a full-width page shell",
  ],
  [
    page.includes("registration-workspace-grid"),
    "desktop onboarding uses a two-column workspace",
  ],
  [
    page.includes("BusinessRegistrationStatusRail"),
    "one unified registration status rail is rendered",
  ],
  [
    rail.includes("Registration status"),
    "status rail explains overall registration status",
  ],
  [
    rail.includes("Business verification"),
    "status rail explains proof verification separately",
  ],
  [
    rail.includes("What happens next?"),
    "status rail gives a human next-step explanation",
  ],
  [
    rail.includes("readiness.nextRequiredStep"),
    "next action comes from canonical readiness",
  ],
  [
    rail.includes("registrationReady"),
    "activation remains governed by canonical readiness",
  ],
  [
    rail.includes("You do not need to upload it again"),
    "manual review does not force unnecessary re-upload",
  ],
  [
    page.includes("Save Draft"),
    "save is presented as a secondary draft action",
  ],
  [
    page.includes("Save and Review"),
    "review action wording is human-readable",
  ],
  [
    uploader.includes("Open PDF"),
    "uploaded PDFs have a useful open-document action",
  ],
  [
    uploader.includes('target="_blank"'),
    "PDF opens without disrupting onboarding state",
  ],
  [
    !page.includes('maxWidth: 900'),
    "legacy 900px onboarding constraint is removed",
  ],
  [
    !verification.includes('maxWidth: 720'),
    "legacy 720px verification constraint is removed",
  ],
  [
    !verification.includes('maxWidth: 760'),
    "legacy 760px verification constraint is removed",
  ],
  [
    css.includes("@media (max-width: 1024px)"),
    "two-column layout collapses responsively",
  ],
  [
    css.includes("position: sticky"),
    "desktop status rail remains visible during the journey",
  ],
  [
    page.includes("canonicalReadiness"),
    "canonical readiness engine remains the authority",
  ],
  [
    page.includes("onFinishRegistration"),
    "existing registration orchestration is preserved",
  ],
];

let failures = 0;

for (const [passed, label] of assertions) {
  console.log(
    `${passed ? "PASS" : "FAIL"}: ${label}`
  );

  if (!passed) failures += 1;
}

if (failures) {
  console.error(
    `${failures} R3.4D assertion(s) failed.`
  );
  process.exit(1);
}

console.log(
  "R3.4D human-first verification experience assertions passed."
);
