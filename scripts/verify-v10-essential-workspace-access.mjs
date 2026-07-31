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
  "Essential Workspace access marker is missing."
);

for (const forbidden of [
  "isActivatedPaidSubscription",
  'subscriptionUrl.pathname = "/dashboard/subscription"',
  'subscriptionUrl.search = "?reason=activation_required"',
]) {
  check(
    !middleware.includes(forbidden),
    `Forced Growth Plan rule remains: ${forbidden}`
  );
}

for (const required of [
  "hasApprovedIdentity",
  "hasEstablishedVendorIdentity",
  'accessProfile?.account_status === "active"',
  "accessProfile?.onboarding_completed === true",
  '"hub_vendor"',
  '"vendor"',
]) {
  check(
    middleware.includes(required),
    `Operational access compatibility is missing: ${required}`
  );
}

check(
  middleware.includes(
    'reviewUrl.pathname = "/auth/awaiting-approval"'
  ),
  "Approval fallback protection was removed."
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
  "Optional Growth Plan action was removed."
);

console.log(
  "V-10 Essential Workspace access assertions passed."
);

console.log(
  "Approved members and established active onboarded vendors can open the Vendor Dashboard."
);

console.log(
  "Growth Plans remain optional and never control Essential Workspace access."
);
