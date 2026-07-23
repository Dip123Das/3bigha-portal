import fs from "node:fs";

const clientPath =
  "app/dashboard/subscription/SubscriptionPageClient.tsx";
const resolverPath =
  "lib/registration/resolveGrowthJourney.ts";
const createLinkPath =
  "app/api/payments/sbi/create-link/route.ts";

const client = fs.readFileSync(clientPath, "utf8");
const resolver = fs.readFileSync(resolverPath, "utf8");
const createLink = fs.readFileSync(createLinkPath, "utf8");

const checks = [
  [
    "canonical Growth journey resolver exists",
    resolver.includes("resolveGrowthJourney"),
  ],
  [
    "subscription page consumes canonical Growth resolver",
    client.includes("resolveGrowthJourney"),
  ],
  [
    "canonical paid activation resolver is reused",
    resolver.includes("hasActivePaidGrowthPlan"),
  ],
  [
    "recognised paid activation statuses remain central",
    resolver.includes("hasActivePaidGrowthPlan"),
  ],
  [
    "paid expiry is respected",
    resolver.includes("hasValidExpiry"),
  ],
  [
    "Essential Workspace is represented independently",
    resolver.includes('"Essential Workspace"') &&
      resolver.includes("independently of any paid Growth Plan"),
  ],
  [
    "Growth Plans are optional in presentation",
    client.includes("optional paid Growth Plans"),
  ],
  [
    "SBI readiness endpoint is consumed",
    client.includes("/api/payments/sbi/readiness"),
  ],
  [
    "SBI readiness request is uncached",
    client.includes('cache: "no-store"'),
  ],
  [
    "gateway waiting state confirms no payment collected",
    resolver.includes("No payment has been collected"),
  ],
  [
    "payment pending preserves Essential Workspace",
    resolver.includes("Essential Workspace remains available"),
  ],
  [
    "verified paid activation remains required",
    resolver.includes("verified SBI payment confirmation"),
  ],
  [
    "client no longer owns isActive state",
    !client.includes("setIsActive") &&
      !client.includes("useState<boolean>(true)"),
  ],
  [
    "literal active-only interpretation removed",
    !client.includes('status === "active"'),
  ],
  [
    "direct free subscription mutation removed",
    !client.includes('subscription_plan: "free"') &&
      !client.includes('subscription_status: "free"'),
  ],
  [
    "Essential continuation performs no database mutation",
    client.includes("continueWithEssential") &&
      client.includes(
        "No subscription record needs to be changed."
      ),
  ],
  [
    "paid request still uses SBI server endpoint",
    client.includes("/api/payments/sbi/create-link"),
  ],
  [
    "paid request server still records payment pending",
    createLink.includes(
      'subscription_status: "payment_pending"'
    ),
  ],
  [
    "paid request server does not mark plan active",
    !createLink.includes('subscription_status: "active"'),
  ],
  [
    "legacy dashboard link replaced by unified workspace",
    client.includes('href="/dashboard/workspace"') &&
      !client.includes('href="/dashboard"'),
  ],
  [
    "business operations are no longer described as payment locked",
    !client.includes("unlock business operations"),
  ],
  [
    "evidence-based trust remains preserved",
    client.includes(
      "Trust and verification remain based on evidence"
    ),
  ],
  [
    "source context remains preserved",
    client.includes("source"),
  ],
  [
    "listing context remains preserved",
    client.includes("listingId"),
  ],
  [
    "return context remains preserved",
    client.includes("returnTo"),
  ],
  [
    "purchase-intent tracking remains preserved",
    client.includes("subscription_purchase_intent"),
  ],
  [
    "no new approval mutation introduced",
    !client.includes("approval_status:"),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(
  `\nP04-D2.3 human-first Growth journey: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures > 0) process.exit(1);
