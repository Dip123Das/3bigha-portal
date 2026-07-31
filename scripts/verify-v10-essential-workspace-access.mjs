import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const middlewarePath = path.join(
  root,
  "middleware.ts"
);

const vendorDashboardPath = path.join(
  root,
  "app/dashboard/vendor/page.tsx"
);

const growthComponentPath = path.join(
  root,
  "components/3bos/vendor/VendorUnifiedGrowthCentre.tsx"
);

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const file of [
  middlewarePath,
  vendorDashboardPath,
  growthComponentPath,
]) {
  check(
    fs.existsSync(file),
    `Required file is missing: ${file}`
  );
}

const middleware = fs.readFileSync(
  middlewarePath,
  "utf8"
);

const vendorDashboard = fs.readFileSync(
  vendorDashboardPath,
  "utf8"
);

const growthComponent = fs.readFileSync(
  growthComponentPath,
  "utf8"
);

check(
  middleware.includes(
    "ESSENTIAL_WORKSPACE_MUST_REMAIN_AVAILABLE"
  ),
  "Essential Workspace access policy marker is missing."
);

for (const forbidden of [
  "isActivatedPaidSubscription",
  'subscriptionUrl.pathname = "/dashboard/subscription"',
  'subscriptionUrl.search = "?reason=activation_required"',
]) {
  check(
    !middleware.includes(forbidden),
    `Forced Growth Plan access rule remains: ${forbidden}`
  );
}

check(
  middleware.includes(
    'reviewUrl.pathname = "/auth/awaiting-approval"'
  ),
  "Identity-approval protection was removed."
);

check(
  middleware.includes(
    'authPathname.startsWith("/dashboard/vendor")'
  ),
  "Vendor Dashboard protection boundary is missing."
);

check(
  vendorDashboard.includes(
    "V7_CANONICAL_VENDOR_DASHBOARD_CUTOVER"
  ),
  "Canonical Vendor Dashboard is missing."
);

check(
  growthComponent.includes(
    'href: "/dashboard/subscription"'
  ),
  "Optional Growth Plan review action was removed."
);

check(
  growthComponent.includes(
    "paid plans and advanced assistance"
  ),
  "Human-first optional Growth Plan language is missing."
);

console.log(
  "V-10 Essential Workspace access assertions passed."
);

console.log(
  "Approved members can open the Vendor Dashboard without purchasing a Growth Plan."
);

console.log(
  "Growth Plans remain optional and available only through deliberate user action."
);
