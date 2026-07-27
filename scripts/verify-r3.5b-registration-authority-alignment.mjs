import fs from "node:fs";

const migrationPath =
  "supabase/migrations/" +
  "20260727000300_align_registration_completion_authority.sql";

const sql = fs.readFileSync(
  migrationPath,
  "utf8"
);

const checks = [
  [
    sql.includes(
      "create or replace function public.business_registration_evidence_ready"
    ),
    "canonical registration authority is replaced",
  ],
  [
    sql.includes("business.business_media_json"),
    "authority reads canonical business_media_json",
  ],
  [
    sql.includes("%/live-selfie/%"),
    "authority recognizes canonical live-selfie evidence",
  ],
  [
    sql.includes("%/practical-proof/%"),
    "authority recognizes canonical workplace evidence",
  ],
  [
    sql.includes(
      "business.vendor_document_verification_json"
    ),
    "authority reads canonical document verification",
  ],
  [
    sql.includes("business.selfie_media_json"),
    "legacy selfie evidence remains a fallback",
  ],
  [
    sql.includes("business.workplace_media_json"),
    "legacy workplace evidence remains a fallback",
  ],
  [
    sql.includes("business.automated_verification_json"),
    "legacy document envelope remains a fallback",
  ],
  [
    sql.includes(
      "profile.registration_verification_status in"
    ),
    "authoritative verification decision remains required",
  ],
  [
    sql.includes("'auto_verified'") &&
      sql.includes("'admin_verified'"),
    "automatic and administrator verification states remain supported",
  ],
  [
    sql.includes(">= 85"),
    "document confidence threshold remains preserved",
  ],
  [
    sql.includes("security definer"),
    "authority remains SECURITY DEFINER",
  ],
  [
    sql.includes(
      "set search_path = public, auth, pg_catalog"
    ),
    "authority retains hardened search path",
  ],
  [
    sql.includes(
      "grant execute on function"
    ) &&
      sql.includes("to authenticated"),
    "authenticated execution remains granted",
  ],
  [
    sql.includes("to service_role"),
    "service-role execution is explicitly preserved",
  ],
];

let failed = 0;

for (const [passed, description] of checks) {
  if (passed) {
    console.log(`PASS: ${description}`);
  } else {
    failed += 1;
    console.error(`FAIL: ${description}`);
  }
}

if (failed > 0) {
  console.error(
    `R3.5B registration authority alignment failed: ${failed} assertion(s).`
  );
  process.exit(1);
}

console.log(
  "R3.5B canonical registration authority assertions passed."
);
