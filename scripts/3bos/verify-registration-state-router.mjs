import fs from "node:fs";

const resolverPath =
  "lib/registration/resolveRegistrationState.ts";
const routerPath =
  "app/auth/post-login/PostLoginPageClient.tsx";

const resolver = fs.readFileSync(resolverPath, "utf8");
const router = fs.readFileSync(routerPath, "utf8");

const checks = [
  [
    "canonical registration state type exists",
    resolver.includes("export type RegistrationState"),
  ],
  [
    "resolver is exported",
    resolver.includes("export function resolveRegistrationState"),
  ],
  [
    "resolver is pure and receives structured input",
    resolver.includes("RegistrationStateInput") &&
      !resolver.includes("supabase."),
  ],
  [
    "Master Admin state is preserved",
    resolver.includes('"MASTER_ADMIN"') &&
      router.includes('case "MASTER_ADMIN"'),
  ],
  [
    "blocked-account state is preserved",
    resolver.includes('"ACCOUNT_BLOCKED"') &&
      router.includes('case "ACCOUNT_BLOCKED"'),
  ],
  [
    "role-selection state exists",
    resolver.includes('"ROLE_SELECTION_REQUIRED"') &&
      router.includes('case "ROLE_SELECTION_REQUIRED"'),
  ],
  [
    "business-profile state exists",
    resolver.includes('"BUSINESS_PROFILE_REQUIRED"') &&
      router.includes('case "BUSINESS_PROFILE_REQUIRED"'),
  ],
  [
    "progressive business entry remains preserved",
    resolver.includes('"BUSINESS_PROGRESSIVE_READY"') &&
      router.includes('case "BUSINESS_PROGRESSIVE_READY"'),
  ],
  [
    "Essential Workspace state exists",
    resolver.includes('"ESSENTIAL_ACTIVE"') &&
      router.includes('case "ESSENTIAL_ACTIVE"'),
  ],
  [
    "district Growth Plan state remains preserved",
    resolver.includes('"GROWTH_PLAN_REQUIRED"') &&
      router.includes("district_free_not_eligible"),
  ],
  [
    "post-login performs one canonical resolution",
    (router.match(/resolveRegistrationState\(/g) || []).length === 1,
  ],
  [
    "post-login routes through one state switch",
    router.includes("switch (registrationState.state)"),
  ],
  [
    "duplicate Master Admin branch removed",
    (router.match(/case "MASTER_ADMIN"/g) || []).length === 1,
  ],
  [
    "unified workspace access resolution remains preserved",
    router.includes("resolveAccessForUser") &&
      router.includes("getDefaultPostLoginPath"),
  ],
  [
    "ordinary default still resolves through unified workspace policy",
    router.includes("getDefaultPostLoginPath(access)"),
  ],
  [
    "no approval or subscription mutation introduced",
    !router.includes('approval_status: "approved"') &&
      !router.includes('subscription_status: "active"') &&
      !resolver.includes('approval_status: "approved"') &&
      !resolver.includes('subscription_status: "active"'),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(
  `\nP04-D2.1 registration-state router: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) process.exit(1);
