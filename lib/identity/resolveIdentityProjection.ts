export type IdentityProjectionMasterRow = {
  identity_key: string;
  label: string;

  legacy_role: string | null;
  legacy_modules: string[] | null;

  dashboard_path: string | null;
  unified_workspace_path: string | null;

  navigation_modules: string[] | null;
  marketplace_modules: string[] | null;
  rfq_modules: string[] | null;

  verification_requirements: string[] | null;
  activation_requirements: string[] | null;

  subscription_policy_key: string | null;
  activation_policy_key: string | null;

  requires_business_onboarding: boolean | null;
  requires_professional_verification: boolean | null;

  is_active: boolean;
};

export type CanonicalIdentityRuntimeProjection = {
  identityKey: string;
  label: string;

  compatibilityRole: string;
  compatibilityModules: string[];

  dashboardPath: string;
  unifiedWorkspacePath: string;

  navigationModules: string[];
  marketplaceModules: string[];
  rfqModules: string[];

  verificationRequirements: string[];
  activationRequirements: string[];

  subscriptionPolicyKey: string;
  activationPolicyKey: string;

  businessOnboardingRequired: boolean;
  professionalVerificationRequired: boolean;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function array(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => clean(item))
        .filter(Boolean)
    )
  );
}

export function resolveIdentityProjection(
  row: IdentityProjectionMasterRow
): CanonicalIdentityRuntimeProjection {
  if (!row?.identity_key) {
    throw new Error(
      "Canonical identity projection requires identity_master.identity_key."
    );
  }

  if (row.is_active !== true) {
    throw new Error(
      `Identity ${row.identity_key} is inactive.`
    );
  }

  const compatibilityModules = array(row.legacy_modules);

  return {
    identityKey: clean(row.identity_key),
    label: clean(row.label) || clean(row.identity_key),

    compatibilityRole:
      clean(row.legacy_role) || "vendor",

    compatibilityModules,

    dashboardPath:
      clean(row.dashboard_path) ||
      "/dashboard/workspace",

    unifiedWorkspacePath:
      clean(row.unified_workspace_path) ||
      "/dashboard/workspace",

    navigationModules:
      array(row.navigation_modules).length
        ? array(row.navigation_modules)
        : compatibilityModules,

    marketplaceModules:
      array(row.marketplace_modules).length
        ? array(row.marketplace_modules)
        : compatibilityModules,

    rfqModules:
      array(row.rfq_modules).length
        ? array(row.rfq_modules)
        : compatibilityModules,

    verificationRequirements:
      array(row.verification_requirements),

    activationRequirements:
      array(row.activation_requirements),

    subscriptionPolicyKey:
      clean(row.subscription_policy_key) ||
      "standard",

    activationPolicyKey:
      clean(row.activation_policy_key) ||
      "standard_verified",

    businessOnboardingRequired:
      row.requires_business_onboarding === true,

    professionalVerificationRequired:
      row.requires_professional_verification === true,
  };
}
