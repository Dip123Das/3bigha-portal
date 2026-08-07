import fs from "node:fs";

const migration = fs.readFileSync(
  "supabase/migrations/20260807213000_crs5_identity_projection_contract.sql",
  "utf8"
);

const resolver = fs.readFileSync(
  "lib/identity/resolveIdentityProjection.ts",
  "utf8"
);

const requiredMigrationMarkers = [
  "alter table public.identity_master",
  "dashboard_path text",
  "unified_workspace_path text",
  "navigation_modules text[]",
  "marketplace_modules text[]",
  "rfq_modules text[]",
  "verification_requirements text[]",
  "activation_requirements text[]",
  "subscription_policy_key text",
  "activation_policy_key text",
  "identity_master_navigation_modules_idx",
  "identity_master_marketplace_modules_idx",
  "identity_master_rfq_modules_idx",
  "identity_master_verification_requirements_idx",
];

for (const marker of requiredMigrationMarkers) {
  if (!migration.includes(marker)) {
    throw new Error(
      `CRS-5A migration marker missing: ${marker}`
    );
  }
}

const requiredResolverMarkers = [
  "CanonicalIdentityRuntimeProjection",
  "resolveIdentityProjection",
  "compatibilityRole",
  "compatibilityModules",
  "dashboardPath",
  "unifiedWorkspacePath",
  "navigationModules",
  "marketplaceModules",
  "rfqModules",
  "verificationRequirements",
  "activationRequirements",
  "subscriptionPolicyKey",
  "activationPolicyKey",
];

for (const marker of requiredResolverMarkers) {
  if (!resolver.includes(marker)) {
    throw new Error(
      `CRS-5A resolver marker missing: ${marker}`
    );
  }
}

if (
  migration.includes("create table public.identity_projection")
) {
  throw new Error(
    "Parallel identity projection table detected."
  );
}

console.log(
  "CRS-5A canonical identity projection contract assertions passed."
);
