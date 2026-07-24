import fs from "node:fs";

const routePath =
  "app/api/onboarding/complete-registration/route.ts";

const source = fs.readFileSync(routePath, "utf8");

const assertions = [
  [
    source.includes(
      'from "@/lib/registration/intelligence"'
    ),
    "registration intelligence module is imported",
  ],
  [
    source.includes(
      '"business_media_json"'
    ),
    "canonical registration media is selected",
  ],
  [
    source.includes(
      '"vendor_document_verification_json"'
    ),
    "canonical document verification is selected",
  ],
  [
    source.includes(
      "resolveRegistrationIntelligence({"
    ),
    "registration intelligence is resolved",
  ],
  [
    source.includes(
      "persistRegistrationIntelligenceSnapshot("
    ),
    "immutable intelligence snapshot is persisted",
  ],
  [
    source.includes(
      'source: "registration_completion"'
    ),
    "snapshot source is registration completion",
  ],
  [
    source.includes(
      "RegistrationIntelligencePersistenceClient"
    ),
    "authenticated persistence client contract is used",
  ],
  [
    source.includes(
      "registrationIntelligence,"
    ),
    "safe intelligence summary is returned",
  ],
  [
    source.includes(
      "REGISTRATION_INTELLIGENCE_FAILED"
    ),
    "intelligence failure has an explicit server error contract",
  ],
  [
    !source.includes(
      "service_role"
    ),
    "route does not introduce service-role registration authority",
  ],
];

let failed = false;

for (const [passed, label] of assertions) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${label}`);

  if (!passed) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  "\nINT-1B2 live registration intelligence integration verified."
);
