import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const postLogin = read(
  "app/auth/post-login/PostLoginPageClient.tsx"
);

const stateResolver = read(
  "lib/registration/resolveRegistrationState.ts"
);

const statusResolver = read(
  "lib/registration/resolveRegistrationStatusPresentation.ts"
);

const growthResolver = read(
  "lib/registration/resolveGrowthJourney.ts"
);

const statusPage = read(
  "app/auth/awaiting-approval/page.tsx"
);

const subscription = read(
  "app/dashboard/subscription/SubscriptionPageClient.tsx"
);

const readiness = read(
  "app/api/payments/sbi/readiness/route.ts"
);

const createLink = read(
  "app/api/payments/sbi/create-link/route.ts"
);

const checks = [
  [
    "canonical registration-state resolver exists",
    stateResolver.includes(
      "resolveRegistrationState"
    ),
  ],
  [
    "registration-state resolver is pure",
    !stateResolver.includes("getSupabase") &&
      !stateResolver.includes(".from(") &&
      !stateResolver.includes("fetch("),
  ],
  [
    "post-login consumes canonical resolver",
    postLogin.includes(
      "resolveRegistrationState"
    ),
  ],
  [
    "post-login performs one canonical resolution",
    [
      ...postLogin.matchAll(
        /resolveRegistrationState\s*\(/g
      ),
    ].length === 1,
  ],
  [
    "post-login uses a state switch",
    postLogin.includes("switch"),
  ],
  [
    "signed-out login recovery is preserved",
    postLogin.includes("/login"),
  ],
  [
    "role-selection runtime route is preserved",
    postLogin.includes("/auth/register-role"),
  ],
  [
    "business onboarding runtime route is preserved",
    postLogin.includes("/onboarding/business"),
  ],
  [
    "Growth Plan runtime route is preserved",
    postLogin.includes("/dashboard/subscription"),
  ],
  [
    "Essential Workspace state exists",
    stateResolver.includes('"ESSENTIAL_ACTIVE"') &&
      postLogin.includes('case "ESSENTIAL_ACTIVE"'),
  ],
  [
    "workspace access remains canonically resolved",
    postLogin.includes("resolveAccessForUser") &&
      postLogin.includes("getDefaultPostLoginPath"),
  ],
  [
    "registration status resolver exists",
    statusResolver.includes(
      "resolveRegistrationStatusPresentation"
    ),
  ],
  [
    "registration status page consumes its resolver",
    statusPage.includes(
      "resolveRegistrationStatusPresentation"
    ),
  ],
  [
    "identity review is separate",
    statusResolver.includes("Identity review"),
  ],
  [
    "Essential Workspace is separate",
    statusResolver.includes("Essential Workspace"),
  ],
  [
    "paid Growth is separate",
    statusResolver.includes("Paid Growth features"),
  ],
  [
    "identity review requires no payment",
    statusResolver.includes(
      "No payment is required for this review"
    ),
  ],
  [
    "Essential Workspace does not wait for SBI",
    statusResolver.includes(
      "does not wait for SBI"
    ),
  ],
  [
    "Growth journey resolver exists",
    growthResolver.includes(
      "resolveGrowthJourney"
    ),
  ],
  [
    "subscription consumes Growth resolver",
    subscription.includes(
      "resolveGrowthJourney"
    ),
  ],
  [
    "paid activation remains canonical",
    growthResolver.includes(
      "hasActivePaidGrowthPlan"
    ),
  ],
  [
    "paid-plan expiry is checked",
    growthResolver.includes("hasValidExpiry"),
  ],
  [
    "SBI readiness comes from server",
    subscription.includes(
      "/api/payments/sbi/readiness"
    ),
  ],
  [
    "SBI readiness is uncached",
    subscription.includes('cache: "no-store"') &&
      readiness.includes("no-store"),
  ],
  [
    "payment request requires login",
    createLink.includes("Login required"),
  ],
  [
    "only valid paid plans are accepted",
    createLink.includes(
      "isPaidSubscriptionPlan"
    ),
  ],
  [
    "restricted accounts remain protected",
    createLink.includes("account_status"),
  ],
  [
    "identity registration precedes payment",
    createLink.includes(
      "Complete identity registration first"
    ),
  ],
  [
    "payment request is created server-side",
    createLink.includes(
      "subscription_payment_requests"
    ),
  ],
  [
    "payment request records pending status",
    createLink.includes(
      'subscription_status: "payment_pending"'
    ),
  ],
  [
    "client cannot activate paid subscription",
    !subscription.includes(
      'subscription_status: "active"'
    ),
  ],
  [
    "payment-link creation cannot activate subscription",
    !createLink.includes(
      'subscription_status: "active"'
    ),
  ],
  [
    "Essential continuation does not mutate subscription",
    !subscription.includes(
      'subscription_plan: "free"'
    ) &&
      !subscription.includes(
        'subscription_status: "free"'
      ),
  ],
  [
    "status page contains no database mutation",
    !statusPage.includes(".update(") &&
      !statusPage.includes(".insert("),
  ],
  [
    "subscription does not payment-lock business operations",
    !subscription.includes(
      "unlock business operations"
    ),
  ],
  [
    "Unified Workspace remains visible from registration status",
    statusResolver.includes(
      "/dashboard/workspace"
    ),
  ],
  [
    "Unified Workspace remains visible from subscription",
    subscription.includes(
      "/dashboard/workspace"
    ),
  ],
  [
    "source context remains preserved",
    subscription.includes("source"),
  ],
  [
    "listing context remains preserved",
    subscription.includes("listingId"),
  ],
  [
    "return context remains preserved",
    subscription.includes("returnTo"),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(
    `${passed ? "PASS" : "FAIL"} ${label}`
  );

  if (!passed) failures += 1;
}

console.log(
  `\nP04-D3 registration runtime integration: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures > 0) process.exit(1);
