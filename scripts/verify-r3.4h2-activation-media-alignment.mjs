import fs from "node:fs";

const sql = fs.readFileSync(
  "supabase/migrations/20260727000200_align_activation_media_evidence.sql",
  "utf8"
);

const checks = [
  [
    sql.includes("business.business_media_json"),
    "activation reads canonical business_media_json",
  ],
  [
    sql.includes("%/live-selfie/%"),
    "activation recognizes canonical live-selfie evidence",
  ],
  [
    sql.includes("%/practical-proof/%"),
    "activation recognizes canonical workplace evidence",
  ],
  [
    sql.includes("v_selfie_status := 'verified'"),
    "stored selfie evidence projects verified status",
  ],
  [
    sql.includes("v_workplace_status := 'verified'"),
    "stored workplace evidence projects verified status",
  ],
  [
    sql.includes("vendor_document_verification_json"),
    "canonical document verification remains supported",
  ],
  [
    sql.includes("activate_self_registered_dashboard"),
    "atomic dashboard activation remains preserved",
  ],
];

let failures = 0;

for (const [passed, label] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${label}`);

  if (!passed) failures += 1;
}

if (failures) {
  process.exit(1);
}

console.log(
  "R3.4H2 activation media alignment assertions passed."
);
