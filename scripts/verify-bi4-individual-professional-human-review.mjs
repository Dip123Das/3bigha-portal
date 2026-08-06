import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const historyMigration = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/20260806183000_individual_professional_human_review.sql"
  ),
  "utf8"
);

const rpcMigration = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/20260806184000_apply_individual_professional_review.sql"
  ),
  "utf8"
);

const route = fs.readFileSync(
  path.join(
    root,
    "app/api/admin/individual-professional-review/route.ts"
  ),
  "utf8"
);

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const marker of [
  "individual_professional_review_history",
  "approved_lifetime_free",
  "correction_requested",
  "rejected_misuse",
  "reclassified_as_business",
  "Immutable authorised human decisions",
  "enable row level security",
  "revoke all",
]) {
  check(
    historyMigration.includes(marker),
    `Human-review schema marker missing: ${marker}`
  );
}

for (const marker of [
  "apply_individual_professional_review",
  "security definer",
  "for update",
  "insert into",
  "individual_professional_review_history",
  "revoke all",
]) {
  check(
    rpcMigration.includes(marker),
    `Human-review RPC marker missing: ${marker}`
  );
}

for (const marker of [
  "requireMasterAdmin",
  "approvalRequirements",
  "approved_lifetime_free",
  "selfie_verification_status",
  "work_evidence_verification_status",
  "identity_name_match_status",
  "confirmed_contractor",
  "lifetime_free_eligible: true",
  "apply_individual_professional_review",
]) {
  check(
    route.includes(marker),
    `Human-review endpoint marker missing: ${marker}`
  );
}

check(
  !route.includes(
    '.from("individual_professional_profiles")\n        .update('
  ),
  "The human-review endpoint must use the atomic RPC instead of a direct profile update."
);

console.log(
  "BI-4 individual professional human-review foundation assertions passed."
);
