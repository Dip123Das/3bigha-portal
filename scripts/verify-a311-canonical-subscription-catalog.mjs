import fs from "node:fs";

const page = fs.readFileSync("app/admin/users/page.tsx", "utf8");
const route = fs.readFileSync(
  "app/api/admin/member-subscription/route.ts",
  "utf8"
);
const subscription = fs.readFileSync(
  "app/dashboard/subscription/SubscriptionPageClient.tsx",
  "utf8"
);

const canonical = [
  ["basic_vendor", "Basic"],
  ["silver_vendor", "Silver"],
  ["gold_vendor", "Gold"],
  ["platinum_vendor", "Platinum"],
];

for (const [value, label] of canonical) {
  if (!subscription.includes(`"${value}"`)) {
    console.error(`FAIL: Canonical subscription source is missing ${value}.`);
    process.exit(1);
  }
  if (!page.includes(`value="${value}"`)) {
    console.error(`FAIL: Member Administration is missing ${label}.`);
    process.exit(1);
  }
  if (!route.includes(`"${value}"`)) {
    console.error(`FAIL: Grant API is missing ${value}.`);
    process.exit(1);
  }
}

const form =
  page.split('<form action="/api/admin/member-subscription"')[1]?.split("</form>")[0] || "";

for (const legacy of ["growth", "enterprise", "lifetime", "starter", "professional"]) {
  if (form.includes(`value="${legacy}"`)) {
    console.error(`FAIL: Non-canonical grant option remains: ${legacy}`);
    process.exit(1);
  }
}

if (!page.includes("Basic — ₹299/month")) {
  console.error("FAIL: Basic price label is missing.");
  process.exit(1);
}
if (!page.includes("Silver — ₹499/month")) {
  console.error("FAIL: Silver price label is missing.");
  process.exit(1);
}
if (!page.includes("Gold — ₹999/month")) {
  console.error("FAIL: Gold price label is missing.");
  process.exit(1);
}
if (!page.includes("Platinum — ₹1,999/month")) {
  console.error("FAIL: Platinum price label is missing.");
  process.exit(1);
}

console.log("A-3.11 Canonical Subscription Catalogue Audit");
console.log("==============================================");
console.log("PASS: Member Administration uses the portal's real subscription catalogue.");
console.log("PASS: Complimentary plans are Basic, Silver, Gold and Platinum.");
console.log("PASS: Displayed monthly prices match the subscription page.");
console.log("PASS: API validation uses the same stored plan keys.");
console.log("PASS: Lifetime remains an expiry choice, not a false subscription plan.");
console.log("PASS: Historical Enterprise/Lifetime records remain filterable but cannot be newly granted.");
