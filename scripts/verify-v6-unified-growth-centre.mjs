import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const projectionPath = path.join(
  root,
  "lib/3bos/vendor/resolve-vendor-workspace-projection.ts"
);

const componentPath = path.join(
  root,
  "components/3bos/vendor/VendorUnifiedGrowthCentre.tsx"
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
  "VendorUnifiedGrowthCentre component is missing."
);

const projection = fs.readFileSync(
  projectionPath,
  "utf8"
);

const component = fs.readFileSync(
  componentPath,
  "utf8"
);

const page = fs.readFileSync(
  pagePath,
  "utf8"
);

for (const marker of [
  "growth:",
  "plan: string",
  "status: string",
  "guidance: string",
]) {
  check(
    projection.includes(marker),
    `Canonical growth field is missing: ${marker}`
  );
}

check(
  component.includes(
    "projection: VendorWorkspaceProjection"
  ),
  "Growth Centre must consume VendorWorkspaceProjection."
);

for (const marker of [
  "projection.growth.plan",
  "projection.growth.status",
  "projection.growth.guidance",
  "projection.identity.profileComplete",
  "projection.identity.capabilityCount",
  "projection.performance.replyRate",
  "projection.performance.visibilityScore",
]) {
  check(
    component.includes(marker),
    `Growth Centre does not consume canonical field: ${marker}`
  );
}

check(
  component.includes(
    'data-v6-unified-growth-centre="active"'
  ),
  "V-6 runtime marker is missing."
);

check(
  component.includes(
    "What should help my business grow next?"
  ),
  "Human-first growth question is missing."
);

check(
  component.includes(
    "Promotion, paid plans and advanced assistance"
  ),
  "Human-first growth restraint is missing."
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
    `Growth Centre contains forbidden data logic: ${forbidden}`
  );
}

check(
  page.includes(
    'import VendorUnifiedGrowthCentre from "@/components/3bos/vendor/VendorUnifiedGrowthCentre";'
  ),
  "Vendor Dashboard does not import Growth Centre."
);

check(
  page.includes("V6_UNIFIED_GROWTH_CENTRE"),
  "Vendor Dashboard V-6 marker is missing."
);

check(
  page.includes("<VendorUnifiedGrowthCentre") &&
    page.includes(
      "projection={vendorWorkspaceProjection}"
    ),
  "Vendor Dashboard does not render the projection-driven Growth Centre."
);

check(
  !page.includes("Extra Suggestions"),
  "Legacy Extra Suggestions block still exists."
);

check(
  !page.includes("aiRecommendations.slice(0, 4)"),
  "Raw AI recommendations are still rendered directly."
);

for (const previousMarker of [
  "V1C1_PROJECTION_DRIVEN_EXECUTIVE_MISSION",
  "V2_HUMAN_FIRST_WORK_CENTRE",
  "V3_UNIFIED_BUSINESS_PULSE",
  "V4_CANONICAL_WORKSPACE_NAVIGATION",
  "V5_UNIFIED_BUSINESS_HEALTH",
]) {
  check(
    page.includes(previousMarker),
    `Previous canonical milestone was removed: ${previousMarker}`
  );
}

console.log(
  "V-6 Unified Growth Centre assertions passed."
);
console.log(
  "Plan, status, guidance and practical growth routes now have one canonical presentation."
);
console.log(
  "Legacy Extra Suggestions and direct AI recommendation rendering were removed."
);
console.log(
  "No Supabase, API or data-loading logic was introduced."
);
