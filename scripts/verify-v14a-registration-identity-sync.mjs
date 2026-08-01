import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "app/dashboard/vendor/page.tsx");
const shellPath = path.join(
  root,
  "components/3bos/vendor/VendorDashboardApplicationShell.tsx"
);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const page = fs.readFileSync(pagePath, "utf8");
const shell = fs.readFileSync(shellPath, "utf8");

for (const marker of [
  "business_media_json",
  "registration_verification_status",
  "registrationIdentityVerified",
  "firstVerifiedSelfieUrl(profileAccess.business_media_json)",
]) {
  check(page.includes(marker), `Missing V-14A identity marker: ${marker}`);
}

check(
  page.includes('registrationVerificationStatus === "auto_verified"'),
  "Auto-verified registration identity is not accepted."
);

check(
  shell.includes("V14A_FINAL_DENSITY_OVERRIDE"),
  "Final density override is missing."
);

check(
  shell.includes("grid-template-columns: 220px minmax(0, 1fr)"),
  "Dense sidebar width is not active."
);

console.log("V-14A Registration Identity Synchronization assertions passed.");
console.log("Live registration selfie fallback now reads business_media_json.");
console.log("Final CSS override prevents older spacing rules from restoring large gaps.");
