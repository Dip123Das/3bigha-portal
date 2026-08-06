import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "supabase/migrations/20260806161000_individual_professional_verification.sql"
);

if (!fs.existsSync(file)) {
  throw new Error(
    "Individual professional verification migration is missing."
  );
}

const sql = fs.readFileSync(file, "utf8");

const markers = [
  "original_name_declared text",
  "original_name_warning_accepted boolean",
  "identity_document_type text",
  "identity_document_masked_reference text",
  "identity_document_storage_path text",
  "identity_document_verification_status text",
  "identity_name_extracted text",
  "identity_name_match_status text",
  "identity_document_consent_at timestamptz",
  "verified_selfie_json jsonb",
  "work_photo_one_json jsonb",
  "work_photo_two_json jsonb",
  "selfie_verification_status text",
  "work_evidence_verification_status text",
  "individual_professional_original_name_warning_guard",
  "individual_professional_identity_consent_guard",
  "Never expose in public profile projections",
  "canonical profile photograph",
];

for (const marker of markers) {
  if (!sql.includes(marker)) {
    throw new Error(
      `Individual professional verification marker missing: ${marker}`
    );
  }
}

console.log(
  "BI-4 individual professional verification schema assertions passed."
);
