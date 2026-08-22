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
      `INV-INT-04C verification failed: ${message}`,
    );
  }
}

const dashboard = read(
  "app/dashboard/vendor/inventory-intelligence/page.tsx",
);

assert(
  dashboard.includes('import Link from "next/link"'),
  "Next.js Link integration is missing",
);

assert(
  dashboard.includes(
    "function getReplenishmentReason",
  ),
  "recommendation explainability is missing",
);

assert(
  dashboard.includes(
    "Why this is recommended:",
  ),
  "recommendation reason is not shown",
);

assert(
  dashboard.includes("Insufficient history"),
  "insufficient-history messaging is missing",
);

assert(
  dashboard.includes(
    "Immediate because current sellable stock is zero",
  ),
  "out-of-stock immediate-priority explanation is missing",
);

assert(
  dashboard.includes("Updated:"),
  "forecast freshness indicator is missing",
);

assert(
  dashboard.includes('href="/rfq/general/new"'),
  "RFQ action handoff is missing",
);

assert(
  dashboard.includes(
    'href="/dashboard/procurement-os"',
  ),
  "procurement action handoff is missing",
);

assert(
  dashboard.includes(
    'href="/dashboard/vendor/inventory"',
  ),
  "inventory review action handoff is missing",
);

assert(
  dashboard.includes(
    '"repeat(auto-fit, minmax(280px, 1fr))"',
  ),
  "responsive replenishment cards are missing",
);

assert(
  !dashboard.includes(
    'subtitle="Deterministic forecasting will activate in INV-INT-03B"',
  ),
  "obsolete duplicate forecast block remains",
);

assert(
  !dashboard.includes(
    "function ForecastPlaceholder",
  ),
  "unused forecast placeholder component remains",
);

assert(
  !dashboard.includes('overflowX: "auto"'),
  "obsolete wide replenishment table remains",
);

assert(
  dashboard.includes("function ReplenishmentFact"),
  "responsive replenishment facts are missing",
);

assert(
  dashboard.includes("function InventoryActionLink"),
  "inventory action handoff component is missing",
);

assert(
  !dashboard.includes("inventory_stock_movements"),
  "legacy inventory movement table must not be used",
);

assert(
  !dashboard.includes(
    "buildDeterministicDemandIntelligence",
  ),
  "dashboard must not duplicate deterministic calculations",
);

console.log(
  "INV-INT-04C Replenishment UX closure assertions passed.",
);
