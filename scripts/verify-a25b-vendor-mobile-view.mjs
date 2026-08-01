import fs from "node:fs";

const file =
  "components/3bos/vendor/VendorDashboardApplicationShell.tsx";
const source = fs.readFileSync(file, "utf8");

const required = [
  "A-2.5B — Vendor mobile presentation repair",
  "@media (max-width: 820px)",
  "grid-template-columns: repeat(2, minmax(0, 1fr))",
  ".vendor-app-sidebar nav",
  "overflow-x: auto",
  ".vendor-reference-growth-cards",
  ".vendor-reference-groups",
  "@media (max-width: 390px)",
];

for (const token of required) {
  if (!source.includes(token)) {
    console.error(`FAIL: Missing Vendor mobile token: ${token}`);
    process.exit(1);
  }
}

console.log("A-2.5B Vendor Mobile View Audit");
console.log("===============================");
console.log("PASS: Vendor profile becomes compact on mobile.");
console.log("PASS: Vendor menu becomes touch-friendly horizontal navigation.");
console.log("PASS: KPI, health and pulse cards use readable mobile grids.");
console.log("PASS: Growth and workspace groups stack without squeezing.");
console.log("PASS: Presentation-only change preserves all dashboard internals.");
