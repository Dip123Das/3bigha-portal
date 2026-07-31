import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const dashboardPath = path.join(
  root,
  "app/dashboard/page.tsx"
);

const vendorDashboardPath = path.join(
  root,
  "app/dashboard/vendor/page.tsx"
);

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

check(
  fs.existsSync(dashboardPath),
  "Generic dashboard route is missing."
);

check(
  fs.existsSync(vendorDashboardPath),
  "Canonical Vendor Dashboard route is missing."
);

const dashboard = fs.readFileSync(
  dashboardPath,
  "utf8"
);

const vendorDashboard = fs.readFileSync(
  vendorDashboardPath,
  "utf8"
);

check(
  dashboard.includes('case "hub_vendor":') &&
    dashboard.includes('return "/dashboard/vendor";'),
  "Vendor Hub does not resolve to the canonical Vendor Dashboard."
);

check(
  !dashboard.includes('case "hub_vendor":\n      return null;'),
  "Vendor Hub is still being retained on the generic dashboard."
);

check(
  vendorDashboard.includes(
    "V7_CANONICAL_VENDOR_DASHBOARD_CUTOVER"
  ),
  "Canonical Vendor Dashboard cutover marker is missing."
);

check(
  vendorDashboard.includes(
    'data-v7-canonical-vendor-dashboard="active"'
  ),
  "Canonical Vendor Dashboard runtime marker is missing."
);

console.log(
  "V-9 Vendor Hub dashboard routing assertions passed."
);

console.log(
  "Vendor Hub now opens the canonical Vendor Dashboard instead of the generic dashboard."
);
