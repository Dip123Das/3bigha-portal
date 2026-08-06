import fs from "node:fs";
import path from "node:path";

const migration = path.join(
  process.cwd(),
  "supabase/migrations/20260806170000_individual_professional_ai_review.sql"
);

if (!fs.existsSync(migration)) {
  throw new Error(
    "Individual professional AI-review migration is missing."
  );
}

const sql = fs.readFileSync(migration, "utf8");

const requiredMarkers = [
  "ai_verification_status text",
  "ai_confidence numeric",
  "ai_result_json jsonb",
  "lifetime_free_decision_status text",
  "lifetime_free_approved_at timestamptz",
  "lifetime_free_approved_by uuid",
  "individual_professional_lifetime_free_approval_guard",
  "AI does not independently approve or suspend",
  "Lifetime-free eligibility becomes true only after authorised approval",
];

for (const marker of requiredMarkers) {
  if (!sql.includes(marker)) {
    throw new Error(
      `Individual professional AI schema marker missing: ${marker}`
    );
  }
}

console.log(
  "BI-4 individual professional AI-review schema assertions passed."
);
