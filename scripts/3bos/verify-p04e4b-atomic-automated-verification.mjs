import fs from "node:fs";

const migrationPath =
  "supabase/migrations/20260723001100_atomic_automated_registration_verification.sql";

const migration = fs.existsSync(migrationPath)
  ? fs.readFileSync(migrationPath, "utf8")
  : "";

const checks = [
  ["migration exists", fs.existsSync(migrationPath)],

  [
    "atomic verification function exists",
    migration.includes(
      "create or replace function public.evaluate_automated_registration_verification()"
    ),
  ],
  [
    "function accepts no client decision parameters",
    migration.includes(
      "evaluate_automated_registration_verification()"
    ) &&
      !migration.includes(
        "evaluate_automated_registration_verification("
          + "\n  p_"
      ),
  ],
  [
    "function is security definer",
    migration.includes("security definer"),
  ],
  [
    "search path is hardened",
    migration.includes(
      "set search_path = public, auth, pg_catalog"
    ),
  ],
  [
    "authentication is required",
    migration.includes("auth.uid()") &&
      migration.includes("Authentication required"),
  ],
  [
    "member profile is locked",
    migration.includes("from public.profiles profile") &&
      migration.includes("for update"),
  ],
  [
    "role is loaded from database",
    migration.includes("profile.role"),
  ],
  [
    "permitted roles are allowlisted",
    migration.includes("v_permitted_roles"),
  ],
  [
    "business evidence is loaded from database",
    migration.includes(
      "from public.business_profiles business"
    ),
  ],
  [
    "business row is locked",
    migration.includes(
      "where business.user_id = v_user_id"
    ),
  ],
  [
    "business roles are explicit",
    migration.includes("v_business_roles"),
  ],
  [
    "blocked accounts are restricted",
    migration.includes("v_blocked_accounts") &&
      migration.includes(
        "v_next_status := 'restricted'"
      ),
  ],
  [
    "restricted dashboard is suspended",
    migration.includes(
      "v_dashboard_status := 'suspended'"
    ),
  ],
  [
    "correction outcome exists",
    migration.includes(
      "v_next_status := 'correction_required'"
    ),
  ],
  [
    "correction precedes review",
    migration.indexOf(
      "v_next_status := 'correction_required'"
    ) <
      migration.indexOf(
        "v_next_status := 'admin_review_required'"
      ),
  ],
  [
    "admin review outcome exists",
    migration.includes(
      "v_next_status := 'admin_review_required'"
    ),
  ],
  [
    "evidence incomplete outcome exists",
    migration.includes(
      "v_next_status := 'evidence_incomplete'"
    ),
  ],
  [
    "automatic verification outcome exists",
    migration.includes(
      "v_next_status := 'auto_verified'"
    ),
  ],
  [
    "automatic verification only makes dashboard ready",
    migration.includes(
      "v_dashboard_status := 'ready'"
    ),
  ],
  [
    "dashboard is never directly activated",
    !migration.includes(
      "v_dashboard_status := 'active'"
    ),
  ],
  [
    "document confidence threshold is conservative",
    migration.includes("v_document_confidence < 85") &&
      migration.includes(
        "v_document_confidence >= 85"
      ),
  ],
  [
    "selfie requires verified status",
    migration.includes(
      "v_selfie_status <> 'verified'"
    ),
  ],
  [
    "selfie requires stored media",
    migration.includes("not v_selfie_present"),
  ],
  [
    "workplace requires verified status",
    migration.includes(
      "v_workplace_status <> 'verified'"
    ),
  ],
  [
    "workplace requires stored media",
    migration.includes("not v_workplace_present"),
  ],
  [
    "profile verification state is written atomically",
    migration.includes(
      "registration_verification_status ="
    ) &&
      migration.includes(
        "registration_verification_score ="
      ) &&
      migration.includes(
        "registration_verification_reasons ="
      ),
  ],
  [
    "verification source is versioned",
    migration.includes(
      "'automated_registration_verification_v1'"
    ),
  ],
  [
    "dashboard readiness is written",
    migration.includes(
      "dashboard_activation_status ="
    ),
  ],
  [
    "activation timestamp is not created",
    migration.includes(
      "when v_dashboard_status = 'active'"
    ) &&
      !migration.includes(
        "dashboard_activated_at = now()"
      ),
  ],
  [
    "automated result is preserved on business profile",
    migration.includes(
      "'registrationDecision'"
    ),
  ],
  [
    "verification event is recorded",
    migration.includes(
      "insert into public.registration_verification_events"
    ),
  ],
  [
    "evidence snapshot is recorded",
    migration.includes("v_evidence_snapshot"),
  ],
  [
    "decision actor remains system",
    migration.includes(
      "'automated_registration_verification_v1'"
    ) &&
      migration.includes(
        "decided_by"
      ),
  ],
  [
    "approval status is not mutated",
    !migration.includes(
      "set approval_status"
    ) &&
      !migration.includes(
        "approval_status = 'approved'"
      ),
  ],
  [
    "subscription is not mutated",
    !migration.includes(
      "set subscription_status"
    ) &&
      !migration.includes(
        "subscription_status ="
      ),
  ],
  [
    "role is not assigned",
    !migration.includes("set role =") &&
      !migration.includes("role :="),
  ],
  [
    "result confirms dashboard is not activated",
    migration.includes(
      "'dashboard_activated',"
    ) &&
      migration.includes("false"),
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
    "function owner is postgres",
    migration.includes("owner to postgres"),
  ],
  [
    "function contract documents separation",
    migration.includes(
      "never assigns roles, changes subscriptions, projects legacy approval, or activates dashboard access"
    ),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);

  if (!passed) {
    failures += 1;
  }
}

console.log(
  `\nP04-E4B atomic automated verification: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) {
  process.exit(1);
}
