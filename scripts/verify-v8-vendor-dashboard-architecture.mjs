import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const pagePath = path.join(
  root,
  "app/dashboard/vendor/page.tsx"
);

const previewPath = path.join(
  root,
  "app/dashboard/vendor/business-os-preview/page.tsx"
);

const middlewarePath = path.join(
  root,
  "middleware.ts"
);

const v1bPath = path.join(
  root,
  "scripts/verify-v1b-vendor-workspace-projection.mjs"
);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

for (const file of [
  pagePath,
  previewPath,
  middlewarePath,
  v1bPath,
]) {
  check(fs.existsSync(file), `Required file missing: ${file}`);
}

const page = fs.readFileSync(pagePath, "utf8");
const preview = fs.readFileSync(previewPath, "utf8");
const middleware = fs.readFileSync(middlewarePath, "utf8");
const v1b = fs.readFileSync(v1bPath, "utf8");

for (const marker of [
  "V1C1_PROJECTION_DRIVEN_EXECUTIVE_MISSION",
  "V2_HUMAN_FIRST_WORK_CENTRE",
  "V5_UNIFIED_BUSINESS_HEALTH",
  "V6_UNIFIED_GROWTH_CENTRE",
  "V3_UNIFIED_BUSINESS_PULSE",
  "V4_CANONICAL_WORKSPACE_NAVIGATION",
  "V7_CANONICAL_VENDOR_DASHBOARD_CUTOVER",
]) {
  check(
    page.includes(marker),
    `Canonical dashboard marker missing: ${marker}`
  );
}

for (const legacy of [
  "WorkspaceHome",
  "GlobalAiOperationalStatus",
  "OperationalRecoveryFeed",
  "Today’s Action Centre",
  "Important Vendor Alerts",
  "DS4A_LIVE_BUSINESS_OS_PREVIEW_ENTRY",
]) {
  check(
    !page.includes(legacy),
    `Legacy dashboard architecture remains: ${legacy}`
  );
}

check(
  preview.includes('redirect("/dashboard/vendor")'),
  "Duplicate Business OS preview route was not retired."
);

check(
  !preview.includes("<BusinessOsRenderer"),
  "Preview route still renders a competing dashboard."
);

for (const cacheMarker of [
  "private, no-store, no-cache",
  "X-3Bigha-Workspace-Cache",
  "Cookie, Authorization",
]) {
  check(
    middleware.includes(cacheMarker),
    `Authenticated cache protection missing: ${cacheMarker}`
  );
}

for (const obsoleteGuard of [
  "WorkspaceHome",
  "GlobalAiOperationalStatus",
  "OperationalRecoveryFeed",
]) {
  check(
    !v1b.includes(obsoleteGuard),
    `V-1B still protects removed legacy UI: ${obsoleteGuard}`
  );
}

console.log(
  "V-8 Vendor Dashboard architectural assertions passed."
);
console.log(
  "One canonical dashboard, one projection flow and private authenticated caching are enforced."
);
