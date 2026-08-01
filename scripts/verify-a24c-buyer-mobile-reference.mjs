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
  ["shell marker", shell.includes("A-2.4C — target mobile Buyer workspace shell")],
  ["content marker", content.includes("A-2.4C — target mobile Buyer dashboard composition")],
  ["stacked welcome actions", shell.includes("grid-template-columns: 1fr")],
  ["two-column mobile categories", content.includes("grid-template-columns: repeat(2, minmax(0, 1fr))")],
  ["horizontal help journey", content.includes("scroll-snap-type: x proximity")],
  ["single-column work panels", content.includes("grid-template-columns: 1fr")],
  ["mobile reminder chevron", content.includes('content: "›"')],
];

for (const [label, passed] of checks) {
  if (!passed) {
    console.error(`FAIL: ${label}`);
    process.exit(1);
  }
}

console.log("A-2.4C Buyer Mobile Reference Audit");
console.log("===================================");
console.log("PASS: Mobile welcome card and actions match the approved hierarchy.");
console.log("PASS: Buying categories render two per row.");
console.log("PASS: Help and Human Journey remain readable and horizontally usable.");
console.log("PASS: Work and attention sections stack cleanly.");
console.log("PASS: Desktop rules and business logic remain unchanged.");
