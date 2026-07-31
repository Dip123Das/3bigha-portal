import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const componentPath = path.join(
  root,
  "components/3bos/vendor/VendorExecutiveMission.tsx"
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
  "VendorExecutiveMission component is missing."
);

const component = fs.readFileSync(componentPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");

assert(
  component.includes(
    'import type {\n  VendorWorkspaceProjection,'
  ),
  "Executive Mission must consume the canonical VendorWorkspaceProjection type."
);

assert(
  component.includes(
    "projection: VendorWorkspaceProjection"
  ),
  "Executive Mission projection prop is missing."
);

assert(
  component.includes(
    "projection.workNow.slice(0, 3)"
  ),
  "Executive Mission must use canonical workNow priorities."
);

assert(
  component.includes(
    "projection.readiness.score"
  ),
  "Executive Mission must use canonical readiness."
);

assert(
  component.includes(
    "projection.pulse.newLeads"
  ),
  "Executive Mission must use canonical business pulse."
);

assert(
  component.includes(
    "projection.growth.guidance"
  ),
  "Executive Mission must use canonical growth guidance."
);

assert(
  !component.includes("getSupabaseBrowser"),
  "Presentation component must not access Supabase."
);

assert(
  !component.includes("useEffect("),
  "Presentation component must not load data."
);

assert(
  !component.includes("fetch("),
  "Presentation component must not call APIs."
);

assert(
  page.includes(
    'import VendorExecutiveMission from "@/components/3bos/vendor/VendorExecutiveMission";'
  ),
  "Vendor Dashboard does not import VendorExecutiveMission."
);

assert(
  page.includes(
    "<VendorExecutiveMission"
  ) &&
    page.includes(
      "projection={vendorWorkspaceProjection}"
    ),
  "Vendor Dashboard does not render the canonical Executive Mission."
);

assert(
  page.includes(
    "V1C1_PROJECTION_DRIVEN_EXECUTIVE_MISSION"
  ),
  "V-1C.1 migration marker is missing."
);

console.log(
  "V-1C.1 Vendor Executive Mission assertions passed."
);

console.log(
  "The Executive Mission is projection-driven and contains no data-loading logic."
);

console.log(
  "Existing Vendor Dashboard systems remain preserved for controlled migration."
);
