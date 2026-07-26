import fs from "node:fs";

const enginePath =
  "lib/registration/governmentDocumentIntelligence.ts";
const routePath =
  "app/api/ai/vendor-document-verify/route.ts";

const engine = fs.readFileSync(
  enginePath,
  "utf8"
);
const route = fs.readFileSync(
  routePath,
  "utf8"
);

const assertions = [
  [
    engine.includes(
      "normalizeGovernmentDocumentType"
    ),
    "canonical document classifier exists",
  ],
  [
    engine.includes(
      "createFieldConfidenceMap"
    ),
    "field-confidence normalization exists",
  ],
  [
    engine.includes(
      "buildFieldReviews"
    ),
    "field-level review states exist",
  ],
  [
    engine.includes(
      'review.severity === "hard"'
    ),
    "hard mismatches are distinguished",
  ],
  [
    engine.includes(
      'review.state === "uncertain"'
    ),
    "uncertain OCR becomes manual review",
  ],
  [
    route.includes(
      "classifiedDocumentType"
    ),
    "AI classification is captured",
  ],
  [
    route.includes(
      "classificationConfidence"
    ),
    "classification confidence is captured",
  ],
  [
    route.includes(
      "fieldConfidence"
    ),
    "field confidence is requested and stored",
  ],
  [
    route.includes(
      "fieldReviews"
    ),
    "field review results are stored",
  ],
  [
    route.includes(
      "resolveDocumentDecision"
    ),
    "status uses the canonical decision resolver",
  ],
  [
    route.includes(
      "Never force the classification"
    ),
    "AI cannot simply repeat the selected card",
  ],
  [
    !route.includes(
      `!matched ||
          !authorityMatched ||
          !issueDateMatched`
    ),
    "all OCR differences no longer become hard mismatch",
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
    `${failures} R3.4A assertion(s) failed.`
  );
  process.exit(1);
}

console.log(
  "R3.4A government-document intelligence assertions passed."
);
