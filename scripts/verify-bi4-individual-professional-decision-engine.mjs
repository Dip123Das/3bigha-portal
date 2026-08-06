import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "lib/3bos/identity/individual-professional-verification.ts"
);

if (!fs.existsSync(file)) {
  throw new Error(
    "Individual professional verification engine is missing."
  );
}

const source = fs.readFileSync(file, "utf8");

const markers = [
  "resolveIndividualProfessionalVerification",
  "eligible_after_human_approval",
  "reclassified_as_business",
  "pending_human_review",
  "confirmed_contractor",
  "likely_unrelated",
  "identityNameMatchStatus === \"mismatch\"",
  "AI recommendation is advisory",
  "confidence >= 0.65",
];

for (const marker of markers) {
  if (!source.includes(marker)) {
    throw new Error(
      `Decision-engine marker missing: ${marker}`
    );
  }
}

if (
  source.includes(
    'recommendedDecision: "approved"'
  )
) {
  throw new Error(
    "AI decision engine must never directly approve lifetime-free eligibility."
  );
}

console.log(
  "BI-4 individual professional decision-engine assertions passed."
);
