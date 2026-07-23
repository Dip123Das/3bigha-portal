import fs from "node:fs";

const pagePath = "app/auth/awaiting-approval/page.tsx";
const resolverPath =
  "lib/registration/resolveRegistrationStatusPresentation.ts";
const readinessPath =
  "app/api/payments/sbi/readiness/route.ts";

const page = fs.readFileSync(pagePath, "utf8");
const resolver = fs.readFileSync(resolverPath, "utf8");
const readiness = fs.readFileSync(readinessPath, "utf8");

const checks = [
  [
    "status page uses canonical presentation resolver",
    page.includes("resolveRegistrationStatusPresentation"),
  ],
  [
    "identity review is presented separately",
    resolver.includes('"Identity review"'),
  ],
  [
    "Essential Workspace is presented separately",
    resolver.includes('"Essential Workspace"'),
  ],
  [
    "paid Growth features are presented separately",
    resolver.includes('"Paid Growth features"'),
  ],
  [
    "generic dashboard Locked label is removed",
    !page.includes('"Locked"') &&
      !resolver.includes('"Locked"'),
  ],
  [
    "payment is not falsely marked Required",
    !page.includes('"Required"') &&
      !resolver.includes('"Required"'),
  ],
  [
    "under-review state explains no payment requirement",
    resolver.includes(
      "No payment is required for this review."
    ),
  ],
  [
    "Essential Workspace does not wait for SBI",
    resolver.includes(
      "does not wait for SBI payment activation"
    ),
  ],
  [
    "gateway-unavailable state is explicit",
    resolver.includes('"Waiting for SBI Gateway"'),
  ],
  [
    "gateway-unavailable state confirms no collection",
    resolver.includes("No payment has been collected"),
  ],
  [
    "paid activation still requires recognised status",
    resolver.includes("PAID_PLAN_STATUSES"),
  ],
  [
    "rejected state supports correction",
    resolver.includes('"Correction required"'),
  ],
  [
    "account restriction routing remains protected",
    page.includes('router.replace("/auth/account-disabled")'),
  ],
  [
    "missing identity routing remains protected",
    page.includes('router.replace("/auth/register-role")'),
  ],
  [
    "SBI readiness comes from server endpoint",
    page.includes("/api/payments/sbi/readiness") &&
      readiness.includes("SBI_INTEGRATION_READY"),
  ],
  [
    "readiness response is not cached",
    readiness.includes('"Cache-Control": "no-store"'),
  ],
  [
    "page does not mutate approval status",
    !page.includes(".update({") &&
      !resolver.includes(".update({"),
  ],
  [
    "page does not mutate subscription status",
    !page.includes("subscription_status:") &&
      !resolver.includes("subscription_status:"),
  ],
  [
    "human-first principle is visible",
    page.includes("Human First. AI Second."),
  ],
  [
    "unified Essential Workspace entry is visible",
    resolver.includes("/dashboard/workspace"),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(
  `\nP04-D2.2 human-first registration status: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures > 0) process.exit(1);
