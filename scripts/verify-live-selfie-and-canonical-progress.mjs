import fs from "node:fs";

const uploader = fs.readFileSync(
  "app/components/media/UniversalMediaUploader.tsx",
  "utf8"
);

const panel = fs.readFileSync(
  "components/onboarding/BusinessVerificationPanel.tsx",
  "utf8"
);

const page = fs.readFileSync(
  "app/onboarding/business/BusinessOnboardingPageClient.tsx",
  "utf8"
);

const checks = [
  [
    uploader.includes(
      "navigator.mediaDevices.getUserMedia"
    ),
    "live camera requests browser media access",
  ],
  [
    uploader.includes(
      "Capture & Upload"
    ),
    "live camera exposes capture and upload",
  ],
  [
    uploader.includes(
      "inlineVideoRef"
    ),
    "live camera renders a visible preview",
  ],
  [
    uploader.includes(
      "Camera permission was not granted"
    ),
    "camera permission failure is explained",
  ],
  [
    uploader.includes(
      "stopInlineCamera"
    ),
    "camera stream is explicitly stopped",
  ],
  [
    panel.includes(
      "inlineCamera"
    ),
    "mandatory selfie enables inline camera",
  ],
  [
    panel.includes(
      'cameraButtonLabel="🤳 Open Device Camera"'
    ),
    "native device-camera fallback remains available",
  ],
  [
    page.includes(
      "completedRegistrationChecks"
    ),
    "profile readiness uses canonical completed checks",
  ],
  [
    page.includes(
      "registrationReadinessChecks.length"
    ),
    "canonical percentage uses all required checks",
  ],
  [
    !page.includes(
      "(identityReady ? 15 : 0)"
    ),
    "old drifting weighted calculation is removed",
  ],
];

let failed = false;

for (const [passed, label] of checks) {
  console.log(
    `${passed ? "PASS" : "FAIL"}: ${label}`
  );

  if (!passed) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  "\nLive selfie and canonical registration progress verified."
);
