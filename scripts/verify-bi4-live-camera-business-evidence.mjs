import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const uploader = fs.readFileSync(
  path.join(
    root,
    "app/components/media/UniversalMediaUploader.tsx"
  ),
  "utf8"
);

const panel = fs.readFileSync(
  path.join(
    root,
    "components/onboarding/BusinessVerificationPanel.tsx"
  ),
  "utf8"
);

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const marker of [
  'captureSource: "live_camera"',
  "captureTimestamp",
  "preparedBeforeUpload",
  'outputPreset?: "square_1080"',
  'outputPreset = "square_1080"',
]) {
  check(
    uploader.includes(marker),
    `Uploader marker missing: ${marker}`
  );
}

for (const marker of [
  "cameraOnly",
  "inlineCamera",
  "requirePreparation",
  'outputPreset="square_1080"',
  "liveCameraPracticalAssets",
  "liveCameraPracticalAssets.length >= 3",
  "mandatoryPhysicalCoverageComplete",
  "signboardAdded &&",
  "workplaceContextAdded &&",
  "businessActivityAdded",
  "At least 3 Live-Camera Business Photos",
]) {
  check(
    panel.includes(marker),
    `Physical-proof marker missing: ${marker}`
  );
}

check(
  !panel.includes(
    "const practicalComplete = practicalAssets.length > 0"
  ),
  "Legacy one-photo completion rule remains."
);

console.log(
  "BI-4 live-camera business-evidence assertions passed."
);
