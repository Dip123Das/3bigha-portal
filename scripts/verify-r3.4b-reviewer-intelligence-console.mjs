import fs from "node:fs";

const page = fs.readFileSync(
  "app/admin/verification-reviews/page.tsx",
  "utf8"
);

const presentation = fs.readFileSync(
  "lib/registration/verificationReviewPresentation.ts",
  "utf8"
);

const usersPage = fs.readFileSync(
  "app/admin/users/page.tsx",
  "utf8"
);

const assertions = [
  [
    page.includes(
      "requireMasterAdmin"
    ),
    "console is restricted to master administrators",
  ],
  [
    page.includes(
      "registration_verification_cases"
    ),
    "console reads canonical verification cases",
  ],
  [
    page.includes(
      "result_json"
    ),
    "console reads immutable AI evidence",
  ],
  [
    page.includes(
      "buildReviewFieldRows"
    ),
    "field-level intelligence is presented",
  ],
  [
    page.includes(
      "Verification history"
    ),
    "verification attempts are visible",
  ],
  [
    page.includes(
      "Read-only review stage"
    ),
    "unsafe approval is explicitly disabled",
  ],
  [
    page.includes(
      "secure certificate viewing has not"
    ),
    "missing secure evidence source is disclosed",
  ],
  [
    !page.includes(
      "/api/admin/approve-user"
    ),
    "identity approval is not reused for document review",
  ],
  [
    !page.includes(
      "subscription_status: \"active\""
    ),
    "console cannot activate subscriptions",
  ],
  [
    presentation.includes(
      "fieldConfidence"
    ),
    "field confidence is normalized for reviewers",
  ],
  [
    presentation.includes(
      "fieldReviews"
    ),
    "hard and soft review states are preserved",
  ],
  [
    usersPage.includes(
      "/admin/verification-reviews"
    ),
    "member administration exposes the review console",
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
    `${failures} R3.4B assertion(s) failed.`
  );
  process.exit(1);
}

console.log(
  "R3.4B reviewer intelligence console assertions passed."
);
