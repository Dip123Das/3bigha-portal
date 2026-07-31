import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const pagePath = path.join(
  root,
  "app/dashboard/vendor/page.tsx"
);

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

check(
  fs.existsSync(pagePath),
  "Vendor Dashboard page is missing."
);

const page = fs.readFileSync(pagePath, "utf8");

const requiredMarkers = [
  "V1C1_PROJECTION_DRIVEN_EXECUTIVE_MISSION",
  "V2_HUMAN_FIRST_WORK_CENTRE",
  "V5_UNIFIED_BUSINESS_HEALTH",
  "V6_UNIFIED_GROWTH_CENTRE",
  "V3_UNIFIED_BUSINESS_PULSE",
  "V4_CANONICAL_WORKSPACE_NAVIGATION",
  "V7_CANONICAL_VENDOR_DASHBOARD_CUTOVER",
];

for (const marker of requiredMarkers) {
  check(
    page.includes(marker),
    `Canonical dashboard marker is missing: ${marker}`
  );
}

check(
  page.includes(
    'data-v7-canonical-vendor-dashboard="active"'
  ),
  "V-7 runtime marker is missing."
);

const indices = requiredMarkers.map(
  (marker) => page.indexOf(marker)
);

for (let index = 1; index < indices.length; index += 1) {
  check(
    indices[index] > indices[index - 1],
    "Vendor Dashboard is not in the canonical action-first order."
  );
}

const forbiddenLegacyMarkers = [
  "DS4A_LIVE_BUSINESS_OS_PREVIEW_ENTRY",
  "<WorkspaceHome",
  "<GlobalAiOperationalStatus",
  "<OperationalRecoveryFeed",
  "Today’s Action Centre",
  "Important Vendor Alerts",
  "Daily vendor work simplified for easy business operations.",
];

for (const marker of forbiddenLegacyMarkers) {
  check(
    !page.includes(marker),
    `Duplicated legacy dashboard layer remains: ${marker}`
  );
}

check(
  page.includes("<VendorExecutiveMission"),
  "Executive Mission rendering was removed."
);

check(
  page.includes("<VendorHumanFirstWorkCentre"),
  "Human-First Work Centre rendering was removed."
);

check(
  page.includes("<VendorUnifiedBusinessHealth"),
  "Business Health rendering was removed."
);

check(
  page.includes("<VendorUnifiedGrowthCentre"),
  "Growth Centre rendering was removed."
);

check(
  page.includes("<VendorUnifiedBusinessPulse"),
  "Business Pulse rendering was removed."
);

check(
  page.includes("<VendorWorkspaceNavigation"),
  "Canonical navigation rendering was removed."
);

check(
  page.includes("<WorkflowContinuityRecorder"),
  "Workflow continuity recording was removed."
);

check(
  page.includes("<OperationalEventRecorder"),
  "Operational event recording was removed."
);

console.log(
  "V-7 Canonical Vendor Dashboard Cutover assertions passed."
);
console.log(
  "The live dashboard now follows Mission, Work, Health, Growth, Intelligence and Navigation."
);
console.log(
  "Duplicated preview, generic workspace, AI status, recovery, action and alert layers were removed."
);
console.log(
  "Existing workflow continuity and operational event systems remain preserved."
);
