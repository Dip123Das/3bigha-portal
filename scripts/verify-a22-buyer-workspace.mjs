#!/usr/bin/env node

/**
 * A-2.2A — Constitutional Buyer Workspace Audit
 *
 * This verification script is intentionally read-only. It checks that the
 * existing Buyer Workspace continues to expose its production workflows while
 * establishing the architectural safeguards required before the A-2.2
 * refactor begins.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "app/dashboard/buyer/page.tsx",
  "components/buyer/BuyerWorkMenu.tsx",
  "app/dashboard/buyer/rfqs/page.tsx",
  "app/dashboard/buyer/inbox/page.tsx",
  "components/operational/UniversalDashboardShell.tsx",
  "components/3bos/workspace-home/WorkspaceHome.tsx",
  "components/3bos/buyer/BuyerDashboardApplicationShell.tsx",
  "components/3bos/buyer/BuyerDashboardApplicationShell.module.css",
  "components/3bos/buyer/BuyerExecutiveDashboard.tsx",
  "components/3bos/buyer/BuyerExecutiveDashboard.module.css",
];

const buyerPage = path.join(root, "app/dashboard/buyer/page.tsx");
const buyerMenu = path.join(root, "components/buyer/BuyerWorkMenu.tsx");

const failures = [];
const observations = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  assert(fs.existsSync(absolute), `Missing required file: ${relativePath}`);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), `Missing required Buyer Workspace dependency: ${file}`);
}

const page = read("app/dashboard/buyer/page.tsx");
const menu = read("components/buyer/BuyerWorkMenu.tsx");

const preservedRoutes = [
  "/rfq",
  "/dashboard/buyer/rfqs",
  "/dashboard/buyer/inbox",
  "/dashboard/inbox",
];

for (const route of preservedRoutes) {
  assert(
    page.includes(route) || menu.includes(route),
    `Buyer Workspace no longer exposes preserved route: ${route}`
  );
}

const preservedSystems = [
  'from("rfqs")',
  "/api/ai/procurement-recommendations",
  "/api/ai/procurement-memory",
  "buildBuyerSmartNotifications",
  "buildUserIntelligence",
  "buildBehaviorMemory",
];

for (const system of preservedSystems) {
  assert(
    page.includes(system),
    `Buyer Workspace production capability missing: ${system}`
  );
}

assert(
  page.includes("UniversalDashboardShell"),
  "Buyer Workspace must remain inside the shared production dashboard shell."
);

assert(
  page.includes("WorkspaceHome"),
  "Homepage Identity Layer / workspace-home integration is missing."
);

assert(
  page.includes("AI") || page.includes("procurementRecommendation"),
  "AI assistance integration was unexpectedly removed."
);

const inlineStyleCount = (page.match(/style=\{\{/g) || []).length;
const largeSectionCount =
  (page.match(/marginBottom:\s*(18|20|22)/g) || []).length +
  (page.match(/<SectionHeader/g) || []).length;

observations.push(`Inline style blocks in Buyer Dashboard: ${inlineStyleCount}`);
observations.push(`Approximate vertically stacked section markers: ${largeSectionCount}`);

if (inlineStyleCount > 12) {
  observations.push(
    "REFRACTOR TARGET: Move repeated inline presentation rules into the A-2.2 Buyer application shell stylesheet."
  );
}

if (!menu.includes("position:") && !menu.includes("sticky")) {
  observations.push(
    "REFRACTOR TARGET: BuyerWorkMenu is not a persistent/sticky left application navigation."
  );
}

if (
  page.includes("/dashboard/inbox-v2") ||
  (page.includes("/dashboard/inbox") && page.includes("/dashboard/buyer/inbox"))
) {
  observations.push(
    "COMPATIBILITY TARGET: Multiple inbox entry routes are visible. Preserve all routes, but expose one clear primary navigation path."
  );
}

if (page.indexOf("WorkspaceHome") < page.indexOf("BuyerWorkMenu")) {
  observations.push(
    "HIERARCHY TARGET: Orientation content currently appears before operational navigation; A-2.2 should make navigation persistent and reduce repeated orientation sections."
  );
}

console.log("A-2.2A Constitutional Buyer Workspace Audit");
console.log("==========================================");
for (const observation of observations) {
  console.log(`- ${observation}`);
}

if (failures.length > 0) {
  console.error("\nFAILED SAFEGUARDS");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nPASS: Existing Buyer APIs, RFQ workflow, procurement intelligence, conversations and compatibility routes remain present.");
console.log("PASS: Buyer Workspace is ready for the A-2.2B application-shell refactor.");
