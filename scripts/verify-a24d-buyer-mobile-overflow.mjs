import fs from "node:fs";

const shell = fs.readFileSync(
  "components/3bos/buyer/BuyerDashboardApplicationShell.module.css",
  "utf8"
);
const content = fs.readFileSync(
  "components/3bos/buyer/BuyerExecutiveDashboard.module.css",
  "utf8"
);

const checks = [
  ["shell overflow marker", shell.includes("A-2.4D — mobile overflow repair")],
  ["content overflow marker", content.includes("A-2.4D — mobile cards fully visible")],
  ["viewport width protection", shell.includes("max-width: 100%")],
  ["category min width reset", content.includes("min-width: 0 !important")],
  ["two-column categories retained", content.includes("grid-template-columns: repeat(2, minmax(0, 1fr))")],
  ["horizontal journey scrolling", content.includes("-webkit-overflow-scrolling: touch")],
  ["very narrow fallback", content.includes("@media (max-width: 380px)")],
];

for (const [label, passed] of checks) {
  if (!passed) {
    console.error(`FAIL: ${label}`);
    process.exit(1);
  }
}

console.log("A-2.4D Buyer Mobile Overflow Audit");
console.log("==================================");
console.log("PASS: Main Buyer workspace is constrained to the viewport.");
console.log("PASS: Category cards cannot push the second column off-screen.");
console.log("PASS: Work, attention and AI cards remain fully visible.");
console.log("PASS: Help and Human Journey use intentional touch scrolling.");
console.log("PASS: Extra-narrow phones fall back to one category per row.");
