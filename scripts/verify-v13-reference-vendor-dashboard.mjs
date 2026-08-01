import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const shellPath = path.join(
  root,
  "components/3bos/vendor/VendorDashboardApplicationShell.tsx"
);

const pagePath = path.join(
  root,
  "app/dashboard/vendor/page.tsx"
);

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

check(fs.existsSync(shellPath), "VendorDashboardApplicationShell.tsx is missing.");
check(fs.existsSync(pagePath), "Vendor dashboard page is missing.");

const shell = fs.readFileSync(shellPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");

const shellMarkers = [
  "data-v13-reference-dashboard",
  "Business Health Centre",
  "Business Growth Operating Centre",
  "Unified Business Pulse",
  "Workspace Navigation"
];

for (const marker of shellMarkers) {
  check(shell.includes(marker), `Missing shell marker: ${marker}`);
}

const pageMarkers = [
  "VendorExecutiveMission",
  "VendorHumanFirstWorkCentre",
  "VendorUnifiedBusinessHealth",
  "VendorUnifiedGrowthCentre",
  "VendorUnifiedBusinessPulse",
  "VendorWorkspaceNavigation"
];

for (const marker of pageMarkers) {
  check(page.includes(marker), `Missing page component: ${marker}`);
}

console.log("");
console.log("========================================");
console.log(" V-13 Vendor Dashboard Verification");
console.log("========================================");
console.log("✓ Vendor shell found");
console.log("✓ Canonical sections found");
console.log("✓ Dashboard page intact");
console.log("✓ V-13 verification PASSED");
console.log("========================================");
