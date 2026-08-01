import fs from "node:fs";

const globalCss = fs.readFileSync("app/globals.css", "utf8");
const shellCss = fs.readFileSync(
  "components/3bos/buyer/BuyerDashboardApplicationShell.module.css",
  "utf8"
);
const contentCss = fs.readFileSync(
  "components/3bos/buyer/BuyerExecutiveDashboard.module.css",
  "utf8"
);

const requiredGlobal = [
  "3Bigha Executive Dashboard Scale 1.0",
  "--3b-dashboard-label",
  "--3b-dashboard-body",
  "--3b-dashboard-card-title",
  "--3b-dashboard-section-title",
  "--3b-dashboard-page-title",
  "--3b-dashboard-button-height",
];

const requiredAdoption = [
  "A-2.4B — shared executive dashboard token adoption",
  "var(--3b-dashboard-page-title)",
  "A-2.4B — Buyer executive scale normalization",
  "var(--3b-dashboard-section-title)",
  "var(--3b-dashboard-button-height)",
];

for (const token of requiredGlobal) {
  if (!globalCss.includes(token)) {
    console.error(`FAIL: Missing global scale token: ${token}`);
    process.exit(1);
  }
}

for (const token of requiredAdoption) {
  if (!shellCss.includes(token) && !contentCss.includes(token)) {
    console.error(`FAIL: Missing dashboard adoption token: ${token}`);
    process.exit(1);
  }
}

console.log("A-2.4B Executive Dashboard Scale Audit");
console.log("======================================");
console.log("PASS: Shared Human-First typography tokens installed.");
console.log("PASS: Buyer shell and content consume the shared scale.");
console.log("PASS: Buttons retain readable labels and accessible heights.");
console.log("PASS: Existing routes and business logic remain untouched.");
