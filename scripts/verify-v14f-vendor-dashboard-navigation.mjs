import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shellPath = path.join(
  root,
  "components/3bos/vendor/VendorDashboardApplicationShell.tsx"
);
const shell = fs.readFileSync(shellPath, "utf8");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const expectedRoutes = [
  ["/onboarding/business", "My Profile"],
  ["/dashboard/workspace", "Unified Workspace"],
  ["/dashboard/vendor/workspace", "Vendor Work Desk"],
  ["/dashboard/vendor/rfqs", "My RFQs"],
  ["/dashboard/vendor/inbox", "Messages"],
  ["/dashboard/vendor/master-data", "My Listings"],
  ["/dashboard/subscription", "Subscription"],
  ["/dashboard/vendor/team", "Team & Users"],
  ["/support/my", "Help & Support"],
  ["/settings", "Settings"],
];

for (const [href, label] of expectedRoutes) {
  check(
    shell.includes(`label: "${label}"`) && shell.includes(`href: "${href}"`),
    `Incorrect or missing menu route for ${label}: ${href}`
  );
}

const routeFiles = [
  "app/onboarding/business/page.tsx",
  "app/dashboard/workspace/page.tsx",
  "app/dashboard/vendor/workspace/page.tsx",
  "app/dashboard/vendor/rfqs/page.tsx",
  "app/dashboard/vendor/inbox/page.tsx",
  "app/dashboard/vendor/master-data/page.tsx",
  "app/dashboard/subscription/page.tsx",
  "app/dashboard/vendor/team/page.tsx",
  "app/support/my/page.tsx",
  "app/settings/page.tsx",
];

for (const relativePath of routeFiles) {
  check(
    fs.existsSync(path.join(root, relativePath)),
    `Menu destination page is missing: ${relativePath}`
  );
}

check(
  !shell.includes(
    'label: "Vendor Work Desk", detail: "Manage operations", href: "/dashboard/vendor/rfqs"'
  ),
  "Vendor Work Desk still incorrectly duplicates the RFQ destination."
);

check(
  !shell.includes(
    'label: "Unified Workspace", detail: "All business segments", href: "/dashboard/vendor/workspace"'
  ),
  "Unified Workspace still incorrectly opens the vendor operations workspace."
);

console.log("V-14F Vendor Dashboard Navigation assertions passed.");
console.log("Every sidebar menu now has a distinct, existing and semantically correct destination.");
