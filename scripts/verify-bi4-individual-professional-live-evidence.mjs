import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const client = fs.readFileSync(
  path.join(
    root,
    "app/onboarding/individual-professional/IndividualProfessionalOnboardingClient.tsx"
  ),
  "utf8"
);

const verificationSection = fs.readFileSync(
  path.join(
    root,
    "app/onboarding/individual-professional/IndividualProfessionalVerificationSection.tsx"
  ),
  "utf8"
);

const mediaConfig = fs.readFileSync(
  path.join(root, "lib/media/media-config.ts"),
  "utf8"
);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

for (const marker of [
  'captureSource?: "live_camera" | "file_upload"',
  "preparedBeforeUpload?: boolean",
  "evidencePurpose?: string",
]) {
  check(
    mediaConfig.includes(marker),
    `Media metadata marker missing: ${marker}`
  );
}

for (const marker of [
  "IndividualProfessionalVerificationSection",
  "originalNameWarningAccepted",
  "selfieAssets",
  "workPhotoOneAssets",
  "workPhotoTwoAssets",
  "mandatoryVerificationComplete",
  'selfie_verification_status: "captured"',
  '"pending_review"',
  "identity_document_consent_version",
]) {
  check(
    client.includes(marker),
    `Registration evidence marker missing: ${marker}`
  );
}

for (const marker of [
  "Verified Live Selfie",
  'cameraFacing="user"',
  "cameraOnly",
  "inlineCamera",
  'cameraGuide="face"',
  'outputPreset="square_1080"',
  "Take First Live Work Photo",
  "Take Second Live Work Photo",
  "Aadhaar is not compulsory",
  "Do not enter a complete unmasked Aadhaar number",
]) {
  check(
    verificationSection.includes(marker),
    `Verification UI marker missing: ${marker}`
  );
}

const cameraOnlyCount =
  (verificationSection.match(/\bcameraOnly\b/g) || [])
    .length;

check(
  cameraOnlyCount === 3,
  `Expected exactly three camera-only evidence controls, found ${cameraOnlyCount}.`
);

console.log(
  "BI-4 individual professional live-evidence assertions passed."
);
