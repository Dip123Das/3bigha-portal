import fs from "node:fs";

const files = {
  page: "app/dashboard/subscription/page.tsx",
  client: "app/dashboard/subscription/SubscriptionPageClient.tsx",
  registrationResolver:
    "lib/registration/resolveRegistrationState.ts",
  statusPresentation:
    "lib/registration/resolveRegistrationStatusPresentation.ts",
  readiness:
    "app/api/payments/sbi/readiness/route.ts",
  createLink:
    "app/api/payments/sbi/create-link/route.ts",
  sbi:
    "lib/payments/sbi.ts",
};

function read(path) {
  if (!fs.existsSync(path)) return "";
  return fs.readFileSync(path, "utf8");
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, read(path)])
);

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function yes(value) {
  return value ? "YES" : "NO";
}

const client = source.client;

const report = {
  generatedAt: new Date().toISOString(),
  files,
  fileLines: Object.fromEntries(
    Object.entries(source).map(([key, text]) => [
      key,
      text ? text.split(/\r?\n/).length : 0,
    ])
  ),

  currentSubscriptionInterpretation: {
    hasLocalActivePlanState: client.includes("setActivePlan"),
    hasLocalIsActiveState: client.includes("setIsActive"),
    readsBusinessProfileSubscription:
      client.includes("subscription_plan") &&
      client.includes("subscription_status"),
    recognisesOnlyLiteralActive:
      client.includes('status === "active"'),
    usesCanonicalPaidPlanResolver:
      client.includes("hasActivePaidGrowthPlan"),
    usesRegistrationStateResolver:
      client.includes("resolveRegistrationState"),
    usesStatusPresentationResolver:
      client.includes("resolveRegistrationStatusPresentation"),
    readsSbiReadinessEndpoint:
      client.includes("/api/payments/sbi/readiness"),
  },

  mutationSurface: {
    businessProfileUpdates: count(
      client,
      /\.from\(["']business_profiles["']\)[\s\S]{0,400}?\.update\(/g
    ),
    directSubscriptionPlanAssignments: count(
      client,
      /subscription_plan\s*:/g
    ),
    directSubscriptionStatusAssignments: count(
      client,
      /subscription_status\s*:/g
    ),
    freePlanDirectMutation:
      client.includes('subscription_plan: "free"') &&
      client.includes('subscription_status: "free"'),
    paidPlanUsesServerPaymentEndpoint:
      client.includes("/api/payments/sbi/create-link"),
  },

  contradictoryLanguage: {
    saysUnlockBusinessOperations:
      /unlock business operations/i.test(client),
    saysOnlinePaymentNotActive:
      /online payment is not active yet/i.test(client),
    saysCurrentGrowthPlan:
      /current growth plan/i.test(client),
    usesActiveWarningIcons:
      client.includes('{isActive ? "✅" : "⚠️"}'),
    treatsFreeAsActive:
      client.includes('pk === "free"') &&
      client.includes("setIsActive"),
    distinguishesEssentialWorkspace:
      /Essential Workspace/i.test(client),
    describesGrowthAsOptional:
      /optional paid Growth|optional Growth|Growth Plans are optional/i.test(
        client
      ),
    preservesEvidenceBasedTrust:
      /Trust and verification remain based on evidence/i.test(client),
  },

  paymentJourney: {
    purchaseIntentTracking:
      client.includes("subscription_purchase_intent"),
    sbiCreateLink:
      client.includes("/api/payments/sbi/create-link"),
    shareablePaymentRequest:
      client.includes("shareUrl") ||
      client.includes("paymentLink"),
    gatewayReadyHandled:
      client.includes("gatewayReady"),
    unpaidPlanMarkedInactive:
      client.includes("setIsActive(false)"),
    noClientPaidActivationMutation:
      !/subscription_plan\s*:\s*plan/.test(client) &&
      !/subscription_status\s*:\s*["']active["']/.test(client),
  },

  navigation: {
    ordinaryBackRouteUsesLegacyDashboard:
      client.includes('href="/dashboard"'),
    unifiedWorkspaceVisible:
      client.includes("/dashboard/workspace"),
    preservesReturnTo:
      client.includes("returnTo"),
    preservesSourceContext:
      client.includes("source"),
    preservesListingContext:
      client.includes("listingId"),
    preservesFocusContext:
      client.includes("focus"),
  },
};

console.log("P04-D2.3 SUBSCRIPTION & GROWTH JOURNEY AUDIT");
console.log("================================================\n");

for (const [section, values] of Object.entries(report)) {
  console.log(section);

  for (const [key, value] of Object.entries(values)) {
    console.log(
      `  ${key}: ${
        typeof value === "boolean" ? yes(value) : JSON.stringify(value)
      }`
    );
  }

  console.log("");
}

const findings = [];

if (
  report.currentSubscriptionInterpretation.hasLocalActivePlanState ||
  report.currentSubscriptionInterpretation.hasLocalIsActiveState
) {
  findings.push(
    "Subscription activation is interpreted locally by the page."
  );
}

if (
  !report.currentSubscriptionInterpretation
    .usesCanonicalPaidPlanResolver
) {
  findings.push(
    "Subscription page does not consume the canonical paid Growth activation resolver."
  );
}

if (
  !report.currentSubscriptionInterpretation
    .readsSbiReadinessEndpoint
) {
  findings.push(
    "Subscription page does not independently load canonical SBI readiness."
  );
}

if (report.mutationSurface.freePlanDirectMutation) {
  findings.push(
    "The client directly mutates business_profiles when selecting Essential."
  );
}

if (
  report.contradictoryLanguage.saysUnlockBusinessOperations
) {
  findings.push(
    "The page says SBI payment unlocks business operations, contradicting Essential Workspace availability."
  );
}

if (
  !report.contradictoryLanguage
    .distinguishesEssentialWorkspace
) {
  findings.push(
    "Essential Workspace is not clearly separated from optional paid Growth features."
  );
}

if (
  report.navigation.ordinaryBackRouteUsesLegacyDashboard &&
  !report.navigation.unifiedWorkspaceVisible
) {
  findings.push(
    "The page still presents the legacy dashboard instead of the unified workspace."
  );
}

console.log("FINDINGS");
console.log("========");

if (findings.length === 0) {
  console.log("No architectural contradictions detected.");
} else {
  findings.forEach((finding, index) => {
    console.log(`${index + 1}. ${finding}`);
  });
}

fs.mkdirSync("artifacts/audits", { recursive: true });

fs.writeFileSync(
  "artifacts/audits/p04d23-subscription-growth-journey.json",
  JSON.stringify({ report, findings }, null, 2) + "\n"
);

console.log(
  "\nSaved: artifacts/audits/p04d23-subscription-growth-journey.json"
);
