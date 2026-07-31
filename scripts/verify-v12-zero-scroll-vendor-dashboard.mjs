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
  if (!condition) throw new Error(message);
}

check(
  fs.existsSync(shellPath),
  "Vendor Dashboard Application Shell is missing."
);

const shell = fs.readFileSync(shellPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");

for (const marker of [
  'data-v12-zero-scroll-dashboard="active"',
  'useState<InternalPanel>("overview")',
  '"mission"',
  '"work"',
  '"health"',
  '"growth"',
  '"pulse"',
  '"navigation"',
  "vendor-focused-workspace",
  "vendor-overview-grid",
]) {
  check(
    shell.includes(marker),
    `V-12 shell marker is missing: ${marker}`
  );
}

for (const section of [
  'id="vendor-executive-mission"',
  'id="vendor-work-centre"',
  'id="vendor-health-centre"',
  'id="vendor-growth-centre"',
  'id="vendor-business-pulse"',
  'id="vendor-workspace-navigation"',
]) {
  check(
    page.includes(section),
    `Canonical dashboard section is missing: ${section}`
  );
}

for (const canonicalComponent of [
  "VendorExecutiveMission",
  "VendorHumanFirstWorkCentre",
  "VendorUnifiedBusinessHealth",
  "VendorUnifiedGrowthCentre",
  "VendorUnifiedBusinessPulse",
  "VendorWorkspaceNavigation",
]) {
  check(
    page.includes(`<${canonicalComponent}`),
    `Canonical component was removed: ${canonicalComponent}`
  );
}

check(
  !shell.includes("getSupabaseBrowser"),
  "Application shell must not introduce Supabase loading."
);

check(
  !shell.includes("fetch("),
  "Application shell must not introduce API loading."
);

console.log(
  "V-12 Zero-Scroll Vendor Dashboard assertions passed."
);

console.log(
  "All canonical V-1 to V-10 workspaces remain available through one-screen navigation."
);
