import fs from "node:fs";

const migrationPath =
  "supabase/migrations/20260723001000_atomic_self_registration_completion.sql";

const routePath =
  "app/api/onboarding/complete-registration/route.ts";

const migration = fs.existsSync(migrationPath)
  ? fs.readFileSync(migrationPath, "utf8")
  : "";

const route = fs.existsSync(routePath)
  ? fs.readFileSync(routePath, "utf8")
  : "";

const checks = [
  ["migration exists", fs.existsSync(migrationPath)],
  ["endpoint exists", fs.existsSync(routePath)],

  [
    "atomic completion function exists",
    migration.includes(
      "complete_self_registration_compatibility"
    ),
  ],
  [
    "completion function is security definer",
    migration.includes("security definer"),
  ],
  [
    "completion function has hardened search path",
    migration.includes(
      "set search_path = public, auth, pg_catalog"
    ),
  ],
  [
    "completion function requires authentication",
    migration.includes("auth.uid()"),
  ],
  [
    "existing role is loaded from profile",
    migration.includes("select profile.role"),
  ],
  [
    "role is not assigned by completion function",
    !migration.includes("set role ="),
  ],
  [
    "authoritative completeness view is used",
    migration.includes(
      "public.v_vendor_profile_completeness"
    ),
  ],
  [
    "business registration is finalized",
    migration.includes(
      "registration_complete = true"
    ),
  ],
  [
    "onboarding compatibility fields are finalized",
    migration.includes("onboarding_version = 2") &&
      migration.includes("onboarding_completed = true"),
  ],
  [
    "module grants are rebuilt atomically",
    migration.includes(
      "delete from public.vendor_module_grants"
    ) &&
      migration.includes(
        "insert into public.vendor_module_grants"
      ),
  ],
  [
    "module grants are allowlisted",
    migration.includes("v_allowed_modules"),
  ],
  [
    "approval status is not changed",
    !migration.includes("approval_status"),
  ],
  [
    "subscription is not activated",
    !migration.includes("subscription_status"),
  ],
  [
    "dashboard activation is not changed",
    !migration.includes(
      "dashboard_activation_status"
    ),
  ],
  [
    "public execution is revoked",
    migration.includes("from public, anon"),
  ],
  [
    "authenticated execution is granted",
    migration.includes("to authenticated"),
  ],
  [
    "endpoint uses canonical server helper",
    route.includes("getSupabaseServerClient"),
  ],
  [
    "endpoint authenticates with getUser",
    route.includes("auth.getUser()"),
  ],
  [
    "endpoint does not accept request body",
    route.includes("export async function POST()") &&
      !route.includes("req.json()"),
  ],
  [
    "endpoint loads role from database",
    route.includes('"role"') &&
      route.includes('.from("profiles")'),
  ],
  [
    "endpoint loads business facts from database",
    route.includes('.from("business_profiles")'),
  ],
  [
    "restricted accounts are blocked",
    route.includes("ACCOUNT_RESTRICTED"),
  ],
  [
    "incomplete business profile is blocked",
    route.includes("BUSINESS_PROFILE_INCOMPLETE"),
  ],
  [
    "location verification is required",
    route.includes("LOCATION_VERIFICATION_REQUIRED"),
  ],
  [
    "compatibility resolver is consumed",
    route.includes(
      "resolveRegistrationCompatibilityProjection"
    ),
  ],
  [
    "authenticated RPC executes completion",
    route.includes(
      '"complete_self_registration_compatibility"'
    ),
  ],
  [
    "client role input is not trusted",
    !route.includes("requestedRole") &&
      !route.includes("roleFromQuery"),
  ],
  [
    "verification remains separate",
    route.includes(
      'verificationDecision: "not_evaluated"'
    ),
  ],
  [
    "dashboard activation remains separate",
    route.includes(
      'dashboardActivation: "not_changed"'
    ),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(
  `\nP04-E3A server registration completion: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) process.exit(1);
