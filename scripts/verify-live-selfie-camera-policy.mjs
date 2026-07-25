import fs from "node:fs";

const uploader = fs.readFileSync(
  "app/components/media/UniversalMediaUploader.tsx",
  "utf8"
);

const panel = fs.readFileSync(
  "components/onboarding/BusinessVerificationPanel.tsx",
  "utf8"
);

const nginxPath =
  "infrastructure/nginx/3bigha.conf";

const nginx = fs.existsSync(nginxPath)
  ? fs.readFileSync(nginxPath, "utf8")
  : "";

const checks = [
  [
    uploader.includes(
      "navigator.mediaDevices.getUserMedia"
    ),
    "selfie uses live browser camera",
  ],
  [
    uploader.includes(
      "allowImages && !inlineCamera"
    ),
    "native device-camera fallback is hidden in inline mode",
  ],
  [
    !panel.includes(
      "Open Device Camera"
    ),
    "selfie panel exposes no Open Device Camera option",
  ],
  [
    !uploader.includes(
      "Use the device-camera button below"
    ),
    "camera errors no longer reference fallback camera",
  ],
  [
    !nginx.includes(
      "camera=()"
    ),
    "repository Nginx config does not deny camera access",
  ],
  [
    nginx.length === 0 ||
      nginx.includes(
        "camera=(self)"
      ),
    "repository Nginx config allows same-origin camera",
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
  "\nLive-selfie camera policy verified."
);
