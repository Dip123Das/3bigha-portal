import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "app/onboarding/business/BusinessOnboardingPageClient.tsx"
  ),
  "utf8"
);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

for (const marker of [
  "useRef",
  "lastAutoVerificationSignatureRef",
  "autoVerificationTimerRef",
  "legalVerificationSignature",
  "hasEnteredLegalRegistration",
  "hasUploadedLegalCertificate",
  "setDocumentVerification(null)",
  "vendor_document_verification_json: null",
  "void runVendorDocumentVerification()",
]) {
  check(
    source.includes(marker),
    `Automatic verification marker missing: ${marker}`
  );
}

check(
  (
    source.match(
      /runVendorDocumentVerification\(\)/g
    ) || []
  ).length >= 2,
  "Automatic verification is not connected to the existing verifier."
);

check(
  source.includes(
    'fetch("/api/ai/vendor-document-verify"'
  ),
  "Existing canonical verification API is missing."
);

console.log(
  "BI-4 automatic legal-document verification assertions passed."
);
