import fs from "node:fs";

const migrationPath =
  "supabase/migrations/20260723000800_self_registration_verification_foundation.sql";

const sql = fs.readFileSync(migrationPath, "utf8");

const checks = [
  ["migration exists", fs.existsSync(migrationPath)],
  [
    "canonical verification status exists",
    sql.includes("registration_verification_status"),
  ],
  [
    "automatic verification state exists",
    sql.includes("'auto_verified'"),
  ],
  [
    "admin exception state exists",
    sql.includes("'admin_review_required'"),
  ],
  [
    "correction state exists",
    sql.includes("'correction_required'"),
  ],
  [
    "security restriction state exists",
    sql.includes("'restricted'"),
  ],
  [
    "dashboard readiness is separate",
    sql.includes("dashboard_activation_status"),
  ],
  [
    "live selfie evidence exists",
    sql.includes("selfie_capture_status") &&
      sql.includes("selfie_media_json"),
  ],
  [
    "workplace evidence exists",
    sql.includes("workplace_evidence_status") &&
      sql.includes("workplace_media_json"),
  ],
  [
    "business description exists",
    sql.includes("business_description"),
  ],
  [
    "verification audit history exists",
    sql.includes("registration_verification_events"),
  ],
  [
    "member can read own verification history",
    sql.includes("user_id = auth.uid()"),
  ],
  [
    "approval status is compatibility only",
    sql.includes("Compatibility projection"),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(
  `\nP04-E1 self-registration foundation: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) process.exit(1);
