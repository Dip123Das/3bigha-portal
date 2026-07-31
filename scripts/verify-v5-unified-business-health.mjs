import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const projectionPath = path.join(
  root,
  "lib/3bos/vendor/resolve-vendor-workspace-projection.ts"
);

const componentPath = path.join(
  root,
  "components/3bos/vendor/VendorUnifiedBusinessHealth.tsx"
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

check(
  fs.existsSync(componentPath),
  "VendorUnifiedBusinessHealth component is missing."
);

const projection = fs.readFileSync(projectionPath, "utf8");
const component = fs.readFileSync(componentPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");

for (const marker of [
  "readiness:",
  "profilePercent:",
  "profileComplete:",
  "capabilityCount:",
  "visibilityScore:",
  "replyRate:",
  "closeRate:",
]) {
  check(
    projection.includes(marker),
    `Canonical health projection field is missing: ${marker}`
  );
}

check(
  component.includes("projection: VendorWorkspaceProjection"),
  "Business Health must consume VendorWorkspaceProjection."
);

for (const marker of [
  "identity.profileComplete",
  "identity.profilePercent",
  "identity.capabilityCount",
  "readiness.score",
  "readiness.label",
  "performance.visibilityScore",
  "performance.replyRate",
  "performance.closeRate",
]) {
  check(
    component.includes(marker),
    `Business Health does not consume canonical field: ${marker}`
  );
}

check(
  component.includes('data-v5-unified-business-health="active"'),
  "V-5 runtime marker is missing."
);

check(
  component.includes("Is my business foundation healthy?"),
  "Human-first Business Health question is missing."
);

for (const forbidden of [
  "getSupabaseBrowser",
  "createClient",
  "fetch(",
  "useEffect(",
  ".from(",
]) {
  check(
    !component.includes(forbidden),
    `Business Health contains forbidden data logic: ${forbidden}`
  );
}

check(
  page.includes(
    'import VendorUnifiedBusinessHealth from "@/components/3bos/vendor/VendorUnifiedBusinessHealth";'
  ),
  "Vendor Dashboard does not import Business Health."
);

check(
  page.includes("V5_UNIFIED_BUSINESS_HEALTH"),
  "Vendor Dashboard V-5 marker is missing."
);

check(
  page.includes("V4_CANONICAL_WORKSPACE_NAVIGATION"),
  "V-4 canonical workspace navigation was removed."
);

check(
  page.includes("<VendorUnifiedBusinessHealth") &&
    page.includes("projection={vendorWorkspaceProjection}"),
  "Vendor Dashboard does not render projection-driven Business Health."
);

check(
  !page.includes("Business Management"),
  "Legacy Business Management block still exists."
);

check(
  page.includes("Extra Suggestions"),
  "Growth-related suggestions were removed prematurely."
);

const missionIndex = page.indexOf(
  "V1C1_PROJECTION_DRIVEN_EXECUTIVE_MISSION"
);
const workIndex = page.indexOf(
  "V2_HUMAN_FIRST_WORK_CENTRE"
);
const pulseIndex = page.indexOf(
  "V3_UNIFIED_BUSINESS_PULSE"
);
const navigationIndex = page.indexOf(
  "V4_CANONICAL_WORKSPACE_NAVIGATION"
);
const healthIndex = page.indexOf(
  "V5_UNIFIED_BUSINESS_HEALTH"
);

check(
  missionIndex >= 0 &&
    workIndex > missionIndex &&
    pulseIndex > workIndex &&
    navigationIndex > pulseIndex &&
    healthIndex > navigationIndex,
  "Canonical Vendor Dashboard hierarchy is incorrect."
);

console.log(
  "V-5 Unified Business Health Centre assertions passed."
);
console.log(
  "Readiness, profile, capability and performance health now have one canonical presentation."
);
console.log(
  "Legacy Business Management duplication was removed."
);
console.log(
  "No Supabase, API or data-loading logic was introduced."
);
