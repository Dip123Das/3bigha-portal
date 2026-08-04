import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const settings = fs.readFileSync(
  path.join(root, "components/profile/UnifiedProfileSettings.tsx"),
  "utf8"
);

const card = fs.readFileSync(
  path.join(root, "components/profile/CanonicalIdentityCard.tsx"),
  "utf8"
);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

for (const marker of [
  "resolveCanonicalIdentity",
  "CanonicalIdentityCard",
  "identity.verifiedSelfie",
  "Retake Verified Live Selfie",
  "/onboarding/business#sec-selfie",
]) {
  check(
    settings.includes(marker),
    `Unified Profile canonical marker missing: ${marker}`
  );
}

for (const marker of [
  "UniversalMediaUploader",
  "UploadedMediaAsset",
  "gallery_upload",
  "handlePhotoChange",
  "useRegistrationSelfie",
  "firstSelfieUrl",
  '.select("business_name,selfie_media_json,subscription_plan")',
]) {
  check(
    !settings.includes(marker),
    `Unified Profile forbidden legacy marker remains: ${marker}`
  );
}

for (const marker of [
  "CanonicalIdentityProjection",
  "verifiedSelfieUrl",
  "Verified Live Selfie",
  "Verified Business",
]) {
  check(
    card.includes(marker),
    `Canonical identity card marker missing: ${marker}`
  );
}

check(
  !card.includes("gallery_upload"),
  "Canonical identity card must never accept gallery photos."
);

console.log(
  "BI-4 canonical Unified Profile assertions passed."
);
