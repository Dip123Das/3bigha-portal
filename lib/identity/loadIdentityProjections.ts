import type { SupabaseClient } from "@supabase/supabase-js";

import {
  resolveIdentityProjection,
  type CanonicalIdentityRuntimeProjection,
  type IdentityProjectionMasterRow,
} from "@/lib/identity/resolveIdentityProjection";

const MASTER_SELECT = [
  "identity_key",
  "label",
  "legacy_role",
  "legacy_modules",
  "dashboard_path",
  "unified_workspace_path",
  "navigation_modules",
  "marketplace_modules",
  "rfq_modules",
  "verification_requirements",
  "activation_requirements",
  "subscription_policy_key",
  "activation_policy_key",
  "requires_business_onboarding",
  "requires_professional_verification",
  "is_active",
].join(",");

function cleanKeys(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

function merge(values: string[][]): string[] {
  return Array.from(new Set(values.flat()));
}

export type CanonicalIdentityProjectionSet = {
  identities: CanonicalIdentityRuntimeProjection[];

  compatibilityModules: string[];

  dashboardPaths: string[];
  unifiedWorkspacePaths: string[];

  navigationModules: string[];
  marketplaceModules: string[];
  rfqModules: string[];

  verificationRequirements: string[];
  activationRequirements: string[];
};

export async function loadIdentityProjectionSet(
  supabase: SupabaseClient,
  identityKeys: unknown
): Promise<CanonicalIdentityProjectionSet> {
  const keys = cleanKeys(identityKeys);

  if (!keys.length) {
    return {
      identities: [],
      compatibilityModules: [],
      dashboardPaths: [],
      unifiedWorkspacePaths: [],
      navigationModules: [],
      marketplaceModules: [],
      rfqModules: [],
      verificationRequirements: [],
      activationRequirements: [],
    };
  }

  const { data, error } = await supabase
    .from("identity_master")
    .select(MASTER_SELECT)
    .in("identity_key", keys)
    .eq("is_active", true);

  if (error) {
    throw new Error(
      `Canonical identity projection lookup failed: ${error.message}`
    );
  }

  const rows = (data || []) as unknown as IdentityProjectionMasterRow[];

  const projections = rows.map(resolveIdentityProjection);

  return {
    identities: projections,

    compatibilityModules: merge(
      projections.map((projection) =>
        projection.compatibilityModules
      )
    ),

    dashboardPaths: Array.from(
      new Set(
        projections
          .map((projection) => projection.dashboardPath)
          .filter(Boolean)
      )
    ),

    unifiedWorkspacePaths: Array.from(
      new Set(
        projections
          .map((projection) => projection.unifiedWorkspacePath)
          .filter(Boolean)
      )
    ),

    navigationModules: merge(
      projections.map((projection) =>
        projection.navigationModules
      )
    ),

    marketplaceModules: merge(
      projections.map((projection) =>
        projection.marketplaceModules
      )
    ),

    rfqModules: merge(
      projections.map((projection) =>
        projection.rfqModules
      )
    ),

    verificationRequirements: merge(
      projections.map((projection) =>
        projection.verificationRequirements
      )
    ),

    activationRequirements: merge(
      projections.map((projection) =>
        projection.activationRequirements
      )
    ),
  };
}
