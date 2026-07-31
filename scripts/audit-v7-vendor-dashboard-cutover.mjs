import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(
  root,
  "app/dashboard/vendor/page.tsx"
);

if (!fs.existsSync(pagePath)) {
  throw new Error("Vendor Dashboard page is missing.");
}

const page = fs.readFileSync(pagePath, "utf8");

const canonical = [
  ["Executive Mission", "V1C1_PROJECTION_DRIVEN_EXECUTIVE_MISSION"],
  ["Human-First Work Centre", "V2_HUMAN_FIRST_WORK_CENTRE"],
  ["Business Pulse", "V3_UNIFIED_BUSINESS_PULSE"],
  ["Workspace Navigation", "V4_CANONICAL_WORKSPACE_NAVIGATION"],
  ["Business Health", "V5_UNIFIED_BUSINESS_HEALTH"],
  ["Growth Centre", "V6_UNIFIED_GROWTH_CENTRE"],
];

const legacy = [
  ["Business OS preview banner", "DS4A_LIVE_BUSINESS_OS_PREVIEW_ENTRY"],
  ["Generic WorkspaceHome", "<WorkspaceHome"],
  ["Global AI operational panel", "<GlobalAiOperationalStatus"],
  ["Operational recovery feed", "<OperationalRecoveryFeed"],
  ["Today’s Action Centre", "Today’s Action Centre"],
  ["Important Vendor Alerts", "Important Vendor Alerts"],
  [
    "Legacy dashboard closing message",
    "Daily vendor work simplified for easy business operations.",
  ],
];

console.log("\nV-7 Vendor Dashboard Structural Audit\n");

for (const [label, marker] of canonical) {
  console.log(
    `${page.includes(marker) ? "FOUND" : "MISSING"} | CANONICAL | ${label}`
  );
}

console.log("");

for (const [label, marker] of legacy) {
  console.log(
    `${page.includes(marker) ? "FOUND" : "REMOVED"} | LEGACY | ${label}`
  );
}

console.log(
  "\nDecision: preserve the six canonical centres and remove the duplicated legacy dashboard surface."
);
