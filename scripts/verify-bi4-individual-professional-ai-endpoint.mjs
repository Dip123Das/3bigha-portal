import fs from "node:fs";
import path from "node:path";

const routePath = path.join(
  process.cwd(),
  "app/api/ai/individual-professional-verify/route.ts"
);

if (!fs.existsSync(routePath)) {
  throw new Error(
    "Individual professional AI endpoint is missing."
  );
}

const source = fs.readFileSync(
  routePath,
  "utf8"
);

const markers = [
  "getSupabaseServerClient",
  "getSupabaseAdmin",
  "resolveIndividualProfessionalVerification",
  "isTrustedLiveCameraAsset",
  "work_photo_one_json",
  "work_photo_two_json",
  "self_working_individual",
  "https://api.openai.com/v1/responses",
  "likely_unrelated",
  "contractor_risk",
  "registration_verification_cases",
  "lifetime_free_eligible: false",
  "lifetimeFreeActivated: false",
  "advisoryOnly: true",
  "Do not identify the person",
  "Do not approve lifetime-free eligibility",
];

for (const marker of markers) {
  if (!source.includes(marker)) {
    throw new Error(
      `AI endpoint marker missing: ${marker}`
    );
  }
}

if (
  source.includes(
    "lifetime_free_eligible: true"
  )
) {
  throw new Error(
    "The AI endpoint must never directly activate lifetime-free eligibility."
  );
}

if (
  !source.includes(
    'profile.economic_mode !=='
  )
) {
  throw new Error(
    "The endpoint must reject non-individual operating modes."
  );
}

console.log(
  "BI-4 individual professional AI-endpoint assertions passed."
);
