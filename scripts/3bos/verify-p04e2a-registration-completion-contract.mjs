import fs from "node:fs";

const migrationPath =
  "supabase/migrations/20260723000900_vendor_registration_complete_contract.sql";

const source = fs.existsSync(migrationPath)
  ? fs.readFileSync(migrationPath, "utf8")
  : "";

const checks = [
  ["migration exists", fs.existsSync(migrationPath)],
  [
    "function is version controlled",
    source.includes(
      "create or replace function public.vendor_registration_complete"
    ),
  ],
  [
    "function remains security definer",
    source.includes("security definer"),
  ],
  [
    "search path is hardened",
    source.includes("set search_path = public, auth, pg_catalog"),
  ],
  [
    "authentication is required",
    source.includes("auth.uid() is null"),
  ],
  [
    "member can finalize only own profile",
    source.includes("auth.uid() <> p_vendor_id"),
  ],
  [
    "authoritative completeness view is used",
    source.includes("public.v_vendor_profile_completeness"),
  ],
  [
    "incomplete registration returns false",
    source.includes("if not v_is_complete"),
  ],
  [
    "registration complete is marked",
    source.includes("registration_complete = true"),
  ],
  [
    "completion timestamp is preserved",
    source.includes(
      "coalesce(bp.registration_completed_at, now())"
    ),
  ],
  [
    "function owner is postgres",
    source.includes(
      "alter function public.vendor_registration_complete(uuid)"
    ) && source.includes("owner to postgres"),
  ],
  [
    "public execution is revoked",
    source.includes("from public, anon"),
  ],
  [
    "authenticated execution is preserved",
    source.includes("to authenticated"),
  ],
  [
    "function documented as compatibility only",
    source.includes("Legacy compatibility finalizer"),
  ],
  [
    "function does not approve profile",
    !source.includes("approval_status = 'approved'"),
  ],
  [
    "function does not activate subscription",
    !source.includes("subscription_status = 'active'"),
  ],
  [
    "function does not activate dashboard",
    !source.includes("dashboard_activation_status = 'active'"),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(
  `\nP04-E2A registration completion contract: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) process.exit(1);
