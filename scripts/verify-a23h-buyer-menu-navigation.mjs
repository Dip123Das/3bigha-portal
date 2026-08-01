import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
};

const shell = read("components/3bos/buyer/BuyerDashboardApplicationShell.tsx");
const styles = read("components/3bos/buyer/BuyerDashboardApplicationShell.module.css");

const destinations = [
  ["Overview", "/dashboard/buyer", "app/dashboard/buyer/page.tsx"],
  ["Requirements", "/dashboard/buyer/rfqs", "app/dashboard/buyer/rfqs/page.tsx"],
  ["Create Requirement", "/rfq", "app/rfq/page.tsx"],
  ["Compare Quotes", "/dashboard/buyer/enquiries", "app/dashboard/buyer/enquiries/page.tsx"],
  ["Conversations", "/dashboard/buyer/inbox", "app/dashboard/buyer/inbox/page.tsx"],
  ["Marketplace", "/search", "app/search/page.tsx"],
  ["All Conversations", "/dashboard/inbox", "app/dashboard/inbox/page.tsx"],
  ["Business Identity", "/dashboard/workspace", "app/dashboard/workspace/page.tsx"],
  ["AI Assistance", "/dashboard/inbox-v2", "app/dashboard/inbox-v2/page.tsx"],
];

for (const [label, href, routeFile] of destinations) {
  assert(
    shell.includes(`label: "${label}", href: "${href}"`),
    `${label} does not use its approved Buyer destination ${href}.`
  );
  assert(exists(routeFile), `${label} destination is missing route source: ${routeFile}.`);
}

assert(
  shell.includes('aria-label="Buyer workspace navigation"'),
  "Buyer navigation needs an accessible navigation label."
);

assert(
  shell.includes("data-buyer-nav-destination={item.href}") &&
    shell.includes("onClick={() => setOpen(false)}"),
  "Responsive menu links must expose their destination and close the mobile drawer."
);

assert(
  styles.includes("@media (max-width: 820px)") &&
    styles.includes("max-height: 100dvh") &&
    styles.includes("overscroll-behavior: contain") &&
    styles.includes("overflow-x: clip"),
  "Responsive Buyer navigation safeguards are incomplete."
);

assert(
  styles.includes("@media (max-width: 520px)") &&
    styles.includes("grid-template-columns: 1fr") &&
    styles.includes("min-height: 44px"),
  "Small-screen Buyer actions are not touch-friendly."
);

console.log("A-2.3H Buyer Menu Navigation Audit");
console.log("=================================");
for (const [label, href] of destinations) {
  console.log(`PASS: ${label} -> ${href}`);
}
console.log("PASS: Desktop, tablet and mobile navigation safeguards verified.");
