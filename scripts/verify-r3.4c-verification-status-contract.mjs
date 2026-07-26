import fs from "node:fs";

const migration = fs.readFileSync(
  "supabase/migrations/20260726001000_align_registration_verification_statuses.sql",
  "utf8"
);

const route = fs.readFileSync(
  "app/api/ai/vendor-document-verify/route.ts",
  "utf8"
);

const intelligence = fs.readFileSync(
  "lib/registration/governmentDocumentIntelligence.ts",
  "utf8"
);

const reviewer = fs.readFileSync(
  "app/admin/verification-reviews/page.tsx",
  "utf8"
);

const assertions = [
  [
    migration.includes("'document_mismatch'"),
    "database accepts canonical document mismatch",
  ],
  [
    migration.includes("'verified_by_ai'"),
    "database accepts AI verification success",
  ],
  [
    migration.includes("'needs_manual_review'"),
    "database accepts manual review",
  ],
  [
    migration.includes("'needs_document'"),
    "database accepts missing-document state",
  ],
  [
    migration.includes("'format_invalid'"),
    "database accepts invalid-format state",
  ],
  [
    migration.includes("'format_valid_document_mismatch'"),
    "legacy mismatch history remains compatible",
  ],
  [
    migration.includes("'format_valid_needs_manual_review'"),
    "legacy manual-review history remains compatible",
  ],
  [
    intelligence.includes('| "document_mismatch"'),
    "intelligence engine exposes canonical mismatch status",
  ],
  [
    route.includes('.from("registration_verification_cases")'),
    "verification route persists immutable history",
  ],
  [
    reviewer.includes('value="document_mismatch"'),
    "review console filters canonical mismatch cases",
  ],
];

let failures = 0;

for (const [passed, label] of assertions) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${label}`);
  if (!passed) failures += 1;
}

if (failures) {
  console.error(`${failures} verification-status assertion(s) failed.`);
  process.exit(1);
}

console.log(
  "R3.4C registration verification status contract assertions passed."
);
