import fs from "node:fs";

const clientPath =
  "app/onboarding/business/BusinessOnboardingPageClient.tsx";

const routePath =
  "app/api/onboarding/complete-registration/route.ts";

const client = fs.existsSync(clientPath)
  ? fs.readFileSync(clientPath, "utf8")
  : "";

const route = fs.existsSync(routePath)
  ? fs.readFileSync(routePath, "utf8")
  : "";

const functionStart = client.indexOf(
  "async function onFinishRegistration()"
);

const functionEnd = client.indexOf(
  "\n\n  if (loading) {",
  functionStart
);

const finishFunction =
  functionStart >= 0 && functionEnd > functionStart
    ? client.slice(functionStart, functionEnd)
    : "";

const checks = [
  ["business onboarding client exists", fs.existsSync(clientPath)],
  ["completion endpoint exists", fs.existsSync(routePath)],
  [
    "finish registration function exists",
    finishFunction.includes(
      "async function onFinishRegistration()"
    ),
  ],
  [
    "business details are saved before completion",
    finishFunction.includes("await saveCommon()"),
  ],
  [
    "incomplete form remains blocked",
    finishFunction.includes("if (!res.isComplete)"),
  ],
  [
    "server completion endpoint is called",
    finishFunction.includes(
      '"/api/onboarding/complete-registration"'
    ),
  ],
  [
    "completion uses POST",
    finishFunction.includes('method: "POST"'),
  ],
  [
    "authenticated cookies are included",
    finishFunction.includes(
      'credentials: "include"'
    ),
  ],
  [
    "completion response is uncached",
    finishFunction.includes(
      'cache: "no-store"'
    ),
  ],
  [
    "browser no longer calls legacy completion RPC",
    !finishFunction.includes(
      "vendor_registration_complete"
    ),
  ],
  [
    "browser no longer writes compatibility profile",
    !finishFunction.includes(
      '.from("profiles")'
    ),
  ],
  [
    "browser no longer deletes module grants",
    !finishFunction.includes(
      '.from("vendor_module_grants")'
    ),
  ],
  [
    "browser no longer builds module grants",
    !finishFunction.includes("grantRows") &&
      !finishFunction.includes("uniqueGrantRows"),
  ],
  [
    "browser no longer derives role from query",
    !finishFunction.includes("roleFromQuery"),
  ],
  [
    "server errors are surfaced",
    finishFunction.includes("payload?.error"),
  ],
  [
    "business incomplete response is handled",
    finishFunction.includes(
      "BUSINESS_PROFILE_INCOMPLETE"
    ),
  ],
  [
    "location verification response is handled",
    finishFunction.includes(
      "LOCATION_VERIFICATION_REQUIRED"
    ),
  ],
  [
    "restricted account response is handled",
    finishFunction.includes("ACCOUNT_RESTRICTED"),
  ],
  [
    "permitted role response is handled",
    finishFunction.includes(
      "PERMITTED_ROLE_REQUIRED"
    ),
  ],
  [
    "completeness is refreshed after success",
    finishFunction.includes(
      "await fetchCompleteness(userId)"
    ),
  ],
  [
    "successful completion preserves redirect",
    finishFunction.includes(
      "router.replace(returnTo)"
    ),
  ],
  [
    "successful completion refreshes router",
    finishFunction.includes("router.refresh()"),
  ],
  [
    "saving state is always released",
    finishFunction.includes("finally") &&
      finishFunction.includes("setSaving(false)"),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(
  `\nP04-E3B registration client cutover: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) process.exit(1);
