import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const projectionPath = path.join(
  root,
  "lib/3bos/vendor/resolve-vendor-workspace-projection.ts"
);

const componentPath = path.join(
  root,
  "components/3bos/vendor/VendorWorkspaceNavigation.tsx"
);

const pagePath = path.join(
  root,
  "app/dashboard/vendor/page.tsx"
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  fs.existsSync(componentPath),
  "VendorWorkspaceNavigation component is missing."
);

const projection = fs.readFileSync(projectionPath, "utf8");
const component = fs.readFileSync(componentPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");

assert(
  projection.includes("VendorWorkspaceNavigationGroup"),
  "Canonical navigation group type is missing."
);

assert(
  projection.includes("navigation: VendorWorkspaceNavigationGroup[]"),
  "VendorWorkspaceProjection does not expose canonical navigation."
);

assert(
  projection.includes("resolveVendorWorkspaceNavigation()"),
  "Canonical navigation resolver is missing."
);

for (const group of [
  'key: "sell"',
  'key: "operate"',
  'key: "grow"',
  'key: "manage"',
]) {
  assert(
    projection.includes(group),
    `Canonical workspace group is missing: ${group}`
  );
}

for (const route of [
  'href: "/dashboard/vendor/rfqs"',
  'href: "/dashboard/vendor/inbox"',
  'href: "/dashboard/vendor/inventory"',
  'href: "/dashboard/vendor/billing"',
  'href: "/dashboard/vendor/dispatch"',
  'href: "/dashboard/vendor/fleet"',
  'href: "/onboarding/business"',
  'href: "/settings"',
]) {
  assert(
    projection.includes(route),
    `Canonical navigation route is missing: ${route}`
  );
}

assert(
  component.includes("projection: VendorWorkspaceProjection"),
  "Workspace Navigation must consume VendorWorkspaceProjection."
);

assert(
  component.includes("projection.navigation.map"),
  "Workspace Navigation must render canonical projection navigation."
);

assert(
  component.includes('data-v4-workspace-navigation="active"'),
  "V-4 runtime marker is missing."
);

assert(
  component.includes("Where do I go to run my business?"),
  "Human-first navigation question is missing."
);

assert(
  !component.includes("getSupabaseBrowser"),
  "Workspace Navigation must not access Supabase."
);

assert(
  !component.includes("fetch("),
  "Workspace Navigation must not call APIs."
);

assert(
  !component.includes("useEffect("),
  "Workspace Navigation must not load data."
);

assert(
  page.includes(
    'import VendorWorkspaceNavigation from "@/components/3bos/vendor/VendorWorkspaceNavigation";'
  ),
  "Vendor Dashboard does not import VendorWorkspaceNavigation."
);

assert(
  page.includes("V4_CANONICAL_WORKSPACE_NAVIGATION"),
  "Vendor Dashboard V-4 marker is missing."
);

assert(
  page.includes("<VendorWorkspaceNavigation") &&
    page.includes("projection={vendorWorkspaceProjection}"),
  "Vendor Dashboard does not render canonical Workspace Navigation."
);

assert(
  !page.includes(
    `            Vendor Work Desk
          </div>`
  ),
  "Visible legacy Vendor Work Desk navigation still exists."
);

assert(
  !page.includes(
    `            Daily Work Areas
          </h2>`
  ),
  "Visible legacy Daily Work Areas navigation still exists."
);

assert(
  page.includes("Business Management"),
  "Business Management was removed prematurely."
);

const missionIndex = page.indexOf("V1C1_PROJECTION_DRIVEN_EXECUTIVE_MISSION");
const workIndex = page.indexOf("V2_HUMAN_FIRST_WORK_CENTRE");
const pulseIndex = page.indexOf("V3_UNIFIED_BUSINESS_PULSE");
const navigationIndex = page.indexOf("V4_CANONICAL_WORKSPACE_NAVIGATION");

assert(
  missionIndex >= 0 &&
    workIndex > missionIndex &&
    pulseIndex > workIndex &&
    navigationIndex > pulseIndex,
  "Canonical dashboard hierarchy is incorrect."
);

console.log("V-4 Canonical Workspace Navigation assertions passed.");
console.log(
  "Sell, Operate, Grow and Manage now form one canonical workspace navigator."
);
console.log(
  "Duplicated Vendor Work Desk and Daily Work Areas navigation were removed."
);
console.log(
  "No Supabase, API or data-loading logic was introduced into presentation."
);
