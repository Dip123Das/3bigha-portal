import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`INV-INT-03A verification failed: ${message}`);
  }
}

const page = read(
  "app/dashboard/vendor/inventory-intelligence/page.tsx",
);

const nav = read("components/vendor-erp/VendorErpNav.tsx");

for (const section of [
  "Inventory Operations Control Center",
  "Executive Status",
  "Recent Stock Operations",
  "Forecast & Replenishment",
  "Supervisor Priority",
]) {
  assert(
    page.includes(section),
    `control center section is missing: ${section}`,
  );
}

for (const metric of [
  "Inventory Health",
  "Available to Sell",
  "Critical Alerts",
  "Reorder Queue",
  "Reservation Load",
  "Warehouse Status",
  "Goods Received",
  "Goods Issued",
]) {
  assert(
    page.includes(metric),
    `control center metric is missing: ${metric}`,
  );
}

for (const forecast of [
  "7-Day Demand",
  "30-Day Demand",
  "90-Day Demand",
  "Lead-Time Risk",
]) {
  assert(
    page.includes(forecast),
    `forecast placeholder is missing: ${forecast}`,
  );
}

assert(
  page.includes("INV-INT-03B"),
  "forecast placeholders must identify their implementation phase",
);

assert(
  page.includes("deterministic inventory conditions"),
  "supervisor priority must remain deterministic-first",
);

assert(
  nav.includes("More business tools"),
  "compact secondary navigation is missing",
);

assert(
  !nav.includes("Operations • Marketplace • Business • AI"),
  "old confusing navigation subtitle must not remain",
);

assert(
  !nav.includes("🤖 Supervisor"),
  "duplicate supervisor navigation label must not remain",
);

console.log(
  "INV-INT-03A Inventory Operations Control Center assertions passed.",
);
