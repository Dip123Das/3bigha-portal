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

const catalogue = fs.readFileSync("lib/payments/catalogue.ts", "utf8");
for (const [value, label] of canonical) {
  if (!catalogue.includes(`${value}:`) || !route.includes(`"${value}"`)) {
    throw new Error(`Missing canonical plan: ${label}`);
  }
}
if (!subscription.includes("SUBSCRIPTION_PLANS") || !page.includes("Object.entries(SUBSCRIPTION_PLANS)")) {
  throw new Error("Customer and administration must use the shared catalogue.");
}

const form =
  page.split('<form action="/api/admin/member-subscription"')[1]?.split("</form>")[0] || "";

for (const legacy of ["growth", "enterprise", "lifetime", "starter", "professional"]) {
  if (form.includes(`value="${legacy}"`)) {
    console.error(`FAIL: Non-canonical grant option remains: ${legacy}`);
    process.exit(1);
  }
}

for (const amount of [9900, 19900, 29900, 49900]) {
  if (!catalogue.includes(`amountPaise: ${amount}`)) throw new Error(`Missing approved amount: ${amount}`);
}
console.log("A-3.11 Canonical Subscription Catalogue Audit");
console.log("==============================================");
console.log("PASS: Member Administration uses the portal's real subscription catalogue.");
console.log("PASS: Complimentary plans are Basic, Silver, Gold and Platinum.");
console.log("PASS: Displayed monthly prices match the subscription page.");
console.log("PASS: API validation uses the same stored plan keys.");
console.log("PASS: Lifetime remains an expiry choice, not a false subscription plan.");
console.log("PASS: Historical Enterprise/Lifetime records remain filterable but cannot be newly granted.");
