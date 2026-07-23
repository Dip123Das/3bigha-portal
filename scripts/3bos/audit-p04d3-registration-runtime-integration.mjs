import fs from "node:fs";

function firstExisting(paths) {
  return paths.find((path) => fs.existsSync(path)) || null;
}

function read(path) {
  return path && fs.existsSync(path)
    ? fs.readFileSync(path, "utf8")
    : "";
}

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

const callbackPath = firstExisting([
  "app/auth/callback/route.ts",
  "app/auth/callback/page.tsx",
  "app/auth/callback/CallbackPageClient.tsx",
]);

const files = {
  callback: callbackPath,
  postLoginPage: "app/auth/post-login/page.tsx",
  postLoginClient:
    "app/auth/post-login/PostLoginPageClient.tsx",
  identityPage: "app/auth/register-role/page.tsx",
  awaitingApproval:
    "app/auth/awaiting-approval/page.tsx",
  subscriptionClient:
    "app/dashboard/subscription/SubscriptionPageClient.tsx",
  workspacePage:
    "app/dashboard/workspace/page.tsx",
  registrationState:
    "lib/registration/resolveRegistrationState.ts",
  registrationPresentation:
    "lib/registration/resolveRegistrationStatusPresentation.ts",
  growthJourney:
    "lib/registration/resolveGrowthJourney.ts",
  sbiReadiness:
    "app/api/payments/sbi/readiness/route.ts",
  sbiCreateLink:
    "app/api/payments/sbi/create-link/route.ts",
  middleware: "middleware.ts",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [
    key,
    read(path),
  ])
);

function has(key, value) {
  return source[key].includes(value);
}

const postLogin = source.postLoginClient;
const resolver = source.registrationState;

const routeMappings = {
  roleSelection:
    postLogin.includes("/auth/register-role"),
  businessProfile:
    postLogin.includes("/onboarding/business"),
  registrationReview:
    postLogin.includes("/auth/awaiting-approval") ||
    postLogin.includes("awaiting-approval"),
  essentialWorkspace:
    postLogin.includes("/dashboard/workspace") ||
    postLogin.includes("resolveUnifiedWorkspaceAccess") ||
    postLogin.includes("workspace-access"),
  growthPlan:
    postLogin.includes("/dashboard/subscription"),
};

const report = {
  generatedAt: new Date().toISOString(),

  files: Object.fromEntries(
    Object.entries(files).map(([key, path]) => [
      key,
      {
        path,
        exists: Boolean(
          path && fs.existsSync(path)
        ),
        lines: source[key]
          ? source[key].split(/\r?\n/).length
          : 0,
      },
    ])
  ),

  callbackAndSession: {
    callbackImplementationFound:
      Boolean(callbackPath),
    callbackRouteBuilt:
      Boolean(callbackPath),
    postLoginPageExists:
      Boolean(source.postLoginPage),
    postLoginClientExists:
      Boolean(postLogin),
    postLoginReadsSession:
      postLogin.includes("getSession") ||
      postLogin.includes("getUser"),
    signedOutRedirectPreserved:
      postLogin.includes("/login"),
  },

  canonicalStateResolution: {
    resolverExists:
      resolver.includes(
        "resolveRegistrationState"
      ),
    resolverIsPure:
      !resolver.includes("getSupabase") &&
      !resolver.includes(".from(") &&
      !resolver.includes("fetch("),
    postLoginConsumesResolver:
      postLogin.includes(
        "resolveRegistrationState"
      ),
    exactlyOneCanonicalResolution:
      count(
        postLogin,
        /resolveRegistrationState\s*\(/g
      ) === 1,
    stateSwitchExists:
      postLogin.includes("switch"),
    noResolverDatabaseMutation:
      !resolver.includes(".update(") &&
      !resolver.includes(".insert(") &&
      !resolver.includes(".delete("),
  },

  stateToRouteIntegration: {
    roleSelectionStateExists:
      resolver.includes("role-selection"),
    roleSelectionRouteMapped:
      routeMappings.roleSelection,

    businessProfileStateExists:
      resolver.includes("business-profile"),
    businessProfileRouteMapped:
      routeMappings.businessProfile,

    registrationReviewStateExists:
      resolver.includes("registration-review") ||
      resolver.includes("awaiting-approval") ||
      resolver.includes("review"),

    essentialWorkspaceStateExists:
      resolver.includes("essential-workspace"),
    essentialWorkspaceRouteMapped:
      routeMappings.essentialWorkspace,

    growthPlanStateExists:
      resolver.includes("growth-plan") ||
      resolver.includes("district"),
    growthPlanRouteMapped:
      routeMappings.growthPlan,
  },

  registrationPresentation: {
    resolverExists:
      has(
        "registrationPresentation",
        "resolveRegistrationStatusPresentation"
      ),
    statusPageConsumesResolver:
      has(
        "awaitingApproval",
        "resolveRegistrationStatusPresentation"
      ),
    identityReviewSeparated:
      has(
        "registrationPresentation",
        "Identity review"
      ),
    essentialWorkspaceSeparated:
      has(
        "registrationPresentation",
        "Essential Workspace"
      ),
    paidGrowthSeparated:
      has(
        "registrationPresentation",
        "Paid Growth features"
      ),
    noPaymentRequiredForReview:
      has(
        "registrationPresentation",
        "No payment is required for this review"
      ),
    workspaceDoesNotWaitForSbi:
      has(
        "registrationPresentation",
        "does not wait for SBI"
      ),
  },

  growthIntegration: {
    resolverExists:
      has(
        "growthJourney",
        "resolveGrowthJourney"
      ),
    subscriptionConsumesResolver:
      has(
        "subscriptionClient",
        "resolveGrowthJourney"
      ),
    canonicalPaidActivationReused:
      has(
        "growthJourney",
        "hasActivePaidGrowthPlan"
      ),
    expiryChecked:
      has(
        "growthJourney",
        "hasValidExpiry"
      ),
    readinessEndpointConsumed:
      has(
        "subscriptionClient",
        "/api/payments/sbi/readiness"
      ),
    readinessRequestUncached:
      has(
        "subscriptionClient",
        'cache: "no-store"'
      ),
    essentialHasNoClientMutation:
      !has(
        "subscriptionClient",
        'subscription_plan: "free"'
      ) &&
      !has(
        "subscriptionClient",
        'subscription_status: "free"'
      ),
  },

  paymentBoundary: {
    readinessServerControlled:
      has(
        "sbiReadiness",
        "SBI_INTEGRATION_READY"
      ),
    readinessNoStore:
      has("sbiReadiness", "no-store"),
    paymentRequiresLogin:
      has("sbiCreateLink", "Login required"),
    paidPlanValidated:
      has(
        "sbiCreateLink",
        "isPaidSubscriptionPlan"
      ),
    restrictedAccountProtected:
      has("sbiCreateLink", "account_status"),
    identityRequired:
      has(
        "sbiCreateLink",
        "Complete identity registration first"
      ),
    requestCreatedServerSide:
      has(
        "sbiCreateLink",
        "subscription_payment_requests"
      ),
    paymentPendingRecorded:
      has(
        "sbiCreateLink",
        'subscription_status: "payment_pending"'
      ),
    clientCannotActivatePaidPlan:
      !has(
        "subscriptionClient",
        'subscription_status: "active"'
      ),
    createLinkCannotActivatePaidPlan:
      !has(
        "sbiCreateLink",
        'subscription_status: "active"'
      ),
  },

  mutationSafety: {
    awaitingApprovalUpdates:
      count(
        source.awaitingApproval,
        /\.update\(/g
      ),
    subscriptionBusinessUpdates:
      count(
        source.subscriptionClient,
        /\.from\(["']business_profiles["']\)[\s\S]{0,500}?\.update\(/g
      ),
    paymentServerBusinessUpdates:
      count(
        source.sbiCreateLink,
        /\.from\(["']business_profiles["']\)[\s\S]{0,500}?\.update\(/g
      ),
    postLoginProfileUpdates:
      count(
        postLogin,
        /\.from\(["']profiles["']\)[\s\S]{0,500}?\.update\(/g
      ),
  },
};

const required = [
  [
    report.callbackAndSession.callbackImplementationFound,
    "Authentication callback implementation was not found.",
  ],
  [
    report.canonicalStateResolution.exactlyOneCanonicalResolution,
    "Post-login must perform exactly one canonical registration-state resolution.",
  ],
  [
    report.stateToRouteIntegration.roleSelectionStateExists &&
      report.stateToRouteIntegration.roleSelectionRouteMapped,
    "Role-selection state is not connected to its runtime route.",
  ],
  [
    report.stateToRouteIntegration.businessProfileStateExists &&
      report.stateToRouteIntegration.businessProfileRouteMapped,
    "Business-profile state is not connected to onboarding.",
  ],
  [
    report.stateToRouteIntegration.essentialWorkspaceStateExists &&
      report.stateToRouteIntegration.essentialWorkspaceRouteMapped,
    "Essential Workspace state is not connected to runtime workspace resolution.",
  ],
  [
    report.growthIntegration.canonicalPaidActivationReused,
    "Growth journey does not reuse canonical paid activation logic.",
  ],
  [
    report.paymentBoundary.clientCannotActivatePaidPlan,
    "Subscription client can activate a paid plan.",
  ],
  [
    report.paymentBoundary.createLinkCannotActivatePaidPlan,
    "Payment-request creation can activate a paid plan.",
  ],
  [
    report.mutationSafety.awaitingApprovalUpdates === 0,
    "Registration status page contains mutation logic.",
  ],
  [
    report.mutationSafety.subscriptionBusinessUpdates === 0,
    "Subscription client contains direct business-profile mutation logic.",
  ],
];

const findings = required
  .filter(([passed]) => !passed)
  .map(([, message]) => message);

console.log(
  "P04-D3 REGISTRATION RUNTIME INTEGRATION AUDIT"
);
console.log(
  "=============================================\n"
);

for (const [section, values] of Object.entries(report)) {
  console.log(section);

  if (
    values &&
    typeof values === "object" &&
    !Array.isArray(values)
  ) {
    for (const [key, value] of Object.entries(values)) {
      console.log(
        `  ${key}: ${
          typeof value === "boolean"
            ? value
              ? "YES"
              : "NO"
            : JSON.stringify(value)
        }`
      );
    }
  } else {
    console.log(`  ${JSON.stringify(values)}`);
  }

  console.log("");
}

console.log("FINDINGS");
console.log("========");

if (findings.length === 0) {
  console.log(
    "No runtime-integration contradiction detected."
  );
} else {
  findings.forEach((finding, index) => {
    console.log(`${index + 1}. ${finding}`);
  });
}

fs.mkdirSync("artifacts/audits", {
  recursive: true,
});

fs.writeFileSync(
  "artifacts/audits/p04d3-registration-runtime-integration.json",
  JSON.stringify(
    {
      report,
      findings,
    },
    null,
    2
  ) + "\n"
);

console.log(
  "\nSaved: artifacts/audits/p04d3-registration-runtime-integration.json"
);

if (findings.length > 0) {
  process.exitCode = 1;
}
