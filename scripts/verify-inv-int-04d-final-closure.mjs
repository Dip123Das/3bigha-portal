import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8",
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(
      `INV-INT-04D verification failed: ${message}`,
    );
  }
}

const dashboard = read(
  "app/dashboard/vendor/inventory-intelligence/page.tsx",
);

assert(
  dashboard.includes("Last Intelligence Refresh"),
  "page-level intelligence freshness is missing",
);

assert(
  dashboard.includes("lastRefreshLabel"),
  "freshness label calculation is missing",
);

for (const href of [
  "/dashboard/vendor/inventory",
  "/rfq/general/new",
  "/dashboard/procurement-os",
  "/dashboard/vendor/billing",
  "/dashboard/vendor/dispatch",
]) {
  assert(
    dashboard.includes(`href="${href}"`),
    `operational navigation is missing: ${href}`,
  );
}

assert(
  dashboard.includes("function OperationalKpiLink"),
  "clickable KPI component is missing",
);

assert(
  dashboard.includes("function InventoryStateNote"),
  "inventory state-note component is missing",
);

assert(
  dashboard.includes(
    "No immediate stock, reservation, ageing or warehouse reconciliation risks were detected.",
  ),
  "healthy inventory state message is missing",
);

assert(
  dashboard.includes(
    "No inward or outward stock movement has been recorded during the last 30 days.",
  ),
  "no-movement state message is missing",
);

assert(
  dashboard.includes(
    '"repeat(auto-fit, minmax(145px, 1fr))"',
  ),
  "dense stock availability grid is missing",
);

assert(
  dashboard.includes(
    '"repeat(auto-fit, minmax(150px, 1fr))"',
  ),
  "dense risk grid is missing",
);

assert(
  dashboard.includes(
    '"repeat(auto-fit, minmax(180px, 1fr))"',
  ),
  "dense valuation grid is missing",
);

assert(
  !dashboard.includes("inventory_stock_movements"),
  "legacy movement table must not be introduced",
);

assert(
  !dashboard.includes(
    "buildDeterministicDemandIntelligence",
  ),
  "dashboard must not duplicate deterministic calculations",
);

console.log(
  "INV-INT-04D UX, navigation and final closure assertions passed.",
);
