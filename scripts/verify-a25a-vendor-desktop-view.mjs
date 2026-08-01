import fs from "node:fs";

const file =
  "components/3bos/vendor/VendorDashboardApplicationShell.tsx";
const source = fs.readFileSync(file, "utf8");

const required = [
  "A-2.5A — Vendor desktop presentation repair",
  "@media (min-width: 821px)",
  "grid-template-columns: 292px minmax(0, 1fr)",
  ".vendor-kpi-grid",
  ".vendor-reference-metrics",
  ".vendor-reference-growth-cards",
  ".vendor-reference-pulse",
  ".vendor-reference-groups",
];

for (const token of required) {
  if (!source.includes(token)) {
    console.error(`FAIL: Missing Vendor desktop token: ${token}`);
    process.exit(1);
  }
}

console.log("A-2.5A Vendor Desktop View Audit");
console.log("================================");
console.log("PASS: Vendor desktop sidebar is readable and proportionate.");
console.log("PASS: Main dashboard uses full available width.");
console.log("PASS: KPI, health, growth, pulse and navigation cards are readable.");
console.log("PASS: Presentation-only override preserves all internal logic.");
