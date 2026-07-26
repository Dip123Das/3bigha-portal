import fs from "node:fs";
import {
  resolveDocumentDecision,
} from "../lib/registration/governmentDocumentIntelligence.ts";

const source = fs.readFileSync(
  "lib/registration/governmentDocumentIntelligence.ts",
  "utf8"
);

function review(
  field,
  state,
  severity,
  confidence = 100,
  matched = null
) {
  return {
    field,
    state,
    severity,
    confidence,
    matched,
  };
}

const autonomousSuccess = resolveDocumentDecision(
  [
    review(
      "document_type",
      "confirmed",
      "hard",
      100,
      true
    ),
    review(
      "registration_number",
      "confirmed",
      "hard",
      100,
      true
    ),
    review(
      "validity",
      "confirmed",
      "hard",
      100,
      true
    ),
    review(
      "business_name",
      "not_available",
      "soft",
      0,
      null
    ),
    review(
      "business_address",
      "not_available",
      "soft",
      0,
      null
    ),
  ],
  {
    readable: true,
    expired: false,
    overallConfidence: 100,
  }
);

const hardUncertainty = resolveDocumentDecision(
  [
    review(
      "document_type",
      "confirmed",
      "hard",
      95,
      true
    ),
    review(
      "registration_number",
      "uncertain",
      "hard",
      65,
      null
    ),
    review(
      "validity",
      "confirmed",
      "hard",
      95,
      true
    ),
  ],
  {
    readable: true,
    expired: false,
    overallConfidence: 90,
  }
);

const hardMismatch = resolveDocumentDecision(
  [
    review(
      "document_type",
      "confirmed",
      "hard",
      100,
      true
    ),
    review(
      "registration_number",
      "mismatch",
      "hard",
      98,
      false
    ),
    review(
      "validity",
      "confirmed",
      "hard",
      100,
      true
    ),
  ],
  {
    readable: true,
    expired: false,
    overallConfidence: 98,
  }
);

const unreadable = resolveDocumentDecision(
  [],
  {
    readable: false,
    expired: false,
    overallConfidence: 100,
  }
);

const expired = resolveDocumentDecision(
  [],
  {
    readable: true,
    expired: true,
    overallConfidence: 100,
  }
);

const assertions = [
  [
    autonomousSuccess === "verified_by_ai",
    "high-confidence document self-verifies when only optional fields are unavailable",
  ],
  [
    hardUncertainty === "needs_manual_review",
    "uncertain authoritative field creates an exception review",
  ],
  [
    hardMismatch === "document_mismatch",
    "confirmed hard mismatch blocks autonomous approval",
  ],
  [
    unreadable === "needs_manual_review",
    "unreadable document requires human review",
  ],
  [
    expired === "format_invalid",
    "expired document cannot self-verify",
  ],
  [
    source.includes("unresolvedHardField"),
    "manual review is restricted to unresolved hard fields",
  ],
  [
    source.includes("Autonomous registration rule"),
    "constitutional autonomous-registration rule is documented",
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
    `${failures} R3.4E assertion(s) failed.`
  );
  process.exit(1);
}

console.log(
  "R3.4E autonomous registration decision assertions passed."
);
