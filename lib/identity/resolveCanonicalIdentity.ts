import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  getDefaultPostLoginPath,
  resolveAccessForUser,
  type AccessContext,
  type VendorCapabilityKey,
} from "@/lib/access/resolveAccess";
import {
  loadIdentityProjectionSet,
} from "@/lib/identity/loadIdentityProjections";
import {
  loadMemberCanonicalIdentityKeys,
} from "@/lib/identity/loadMemberCanonicalIdentityKeys";
import {
  loadOperatingCapabilityProjection,
  type OperatingCapabilityProjection,
} from "@/lib/identity/loadOperatingCapabilityProjection";

export type CanonicalVerificationState =
  | "not_started"
  | "pending"
  | "verified"
  | "rejected"
  | "unknown";

export type CanonicalCompletionState =
  | "not_started"
  | "in_progress"
  | "complete";

export type CanonicalNavigationItem = {
  key: string;
  label: string;
  href: string;
};

export type CanonicalIdentityProjection = {
  userId: string;
  email: string | null;
  registeredName: string;
  primaryRole: string;
  verifiedHuman: boolean;
  verifiedBusiness: boolean;
  verifiedSelfie: boolean;
  verifiedSelfieUrl: string;
  businessConstitution: string;
  businessIdentity: string[];
  individualIdentity: string[];
  businessName: string;
  verificationStatus: {
    human: CanonicalVerificationState;
    selfie: CanonicalVerificationState;
    business: CanonicalVerificationState;
  };
  approvalStatus: string;
  completionStatus: CanonicalCompletionState;
  workspaceProjection: {
    defaultPath: string;
    unifiedPath: string;
    capabilities: VendorCapabilityKey[];
  };
  operatingProjection: OperatingCapabilityProjection;
  marketplaceProjection: {
    visible: boolean;
    businessName: string;
    businessIdentities: string[];
  };
  navigationProjection: CanonicalNavigationItem[];
  permissionProjection: AccessContext;
  profile: Record<string, unknown>;
  businessProfile: Record<string, unknown>;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function bool(value: unknown) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.map((item) => clean(item)).filter(Boolean))
  );
}

function normalizeVerification(value: unknown): CanonicalVerificationState {
  const normalized = clean(value).toLowerCase();

  if (!normalized) return "not_started";
  if (["verified", "approved", "complete", "completed"].includes(normalized)) {
    return "verified";
  }
  if (["pending", "submitted", "under_review", "in_review"].includes(normalized)) {
    return "pending";
  }
  if (["rejected", "declined", "failed"].includes(normalized)) {
    return "rejected";
  }

  return "unknown";
}

function firstVerifiedSelfieUrl(value: unknown) {
  const assets = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : [];

  for (const asset of assets as Record<string, unknown>[]) {
    const url = clean(asset?.url || asset?.publicUrl);
    const path = clean(asset?.path);

    if (url && path.includes("/live-selfie/")) {
      return url;
    }
  }

  return "";
}

function roleLabel(value: unknown) {
  const normalized = clean(value).toLowerCase().replace(/_/g, " ");

  if (!normalized) return "3Bigha Member";
  if (normalized === "hub vendor") return "Vendor Hub";
  if (normalized === "master admin") return "Master Administrator";

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function navigationItemForModule(
  moduleKey: string
): CanonicalNavigationItem | null {
  switch (moduleKey) {
    case "materials":
      return {
        key: "materials",
        label: "Materials",
        href: "/dashboard/vendor/materials",
      };

    case "services":
      return {
        key: "services",
        label: "Services",
        href: "/dashboard/vendor/services",
      };

    case "rentals":
      return {
        key: "rentals",
        label: "Rentals",
        href: "/dashboard/vendor/rentals",
      };

    case "property_owner":
    case "property_builder":
      return {
        key: "property",
        label: "Property",
        href: "/dashboard/vendor/property",
      };

    case "blog_author":
      return {
        key: "blog",
        label: "Blog / News",
        href: "/blog/my",
      };

    case "investor":
      return {
        key: "investment",
        label: "Investment",
        href: "/dashboard/investor",
      };

    default:
      return null;
  }
}

function buildProjectedNavigation(
  navigationModules: string[],
  defaultPath: string,
  access: AccessContext
): CanonicalNavigationItem[] {
  if (access.isAdmin) {
    return [
      {
        key: "admin",
        label: "Admin Dashboard",
        href: "/admin/dashboard",
      },
      {
        key: "workspace",
        label: "Unified Workspace",
        href: "/dashboard/workspace",
      },
      {
        key: "profile",
        label: "My Identity",
        href: "/settings",
      },
    ];
  }

  const items: CanonicalNavigationItem[] = [
    {
      key: "workspace",
      label: "Unified Workspace",
      href: defaultPath || "/dashboard/workspace",
    },
    {
      key: "profile",
      label: "My Identity",
      href: "/settings",
    },
  ];

  for (const moduleKey of navigationModules) {
    const item = navigationItemForModule(moduleKey);

    if (
      item &&
      !items.some(
        (existing) =>
          existing.key === item.key ||
          existing.href === item.href
      )
    ) {
      items.push(item);
    }
  }

  return items;
}

function resolveCompletion(
  profile: Record<string, unknown>,
  business: Record<string, unknown>
): CanonicalCompletionState {
  if (
    bool(profile.onboarding_completed) ||
    bool(business.business_profile_complete) ||
    bool(business.is_complete) ||
    bool(business.registration_complete)
  ) {
    return "complete";
  }

  if (
    clean(profile.display_name) ||
    clean(profile.full_name) ||
    clean(business.business_name) ||
    stringArray(business.business_identities).length > 0
  ) {
    return "in_progress";
  }

  return "not_started";
}

export async function resolveCanonicalIdentity(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email" | "user_metadata">
): Promise<CanonicalIdentityProjection> {
  const [profileResult, businessResult, access] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    resolveAccessForUser(supabase, user.id, user.email),
  ]);

  const profile = (profileResult.data || {}) as Record<string, unknown>;
  const business = (businessResult.data || {}) as Record<string, unknown>;
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;

  const selfieStatus = normalizeVerification(
    business.selfie_capture_status || business.selfie_verification_status
  );
  const evidenceSelfieUrl = firstVerifiedSelfieUrl(
    business.selfie_media_json
  );
  const selectedSelfieUrl =
    clean(profile.profile_photo_source) === "registration_selfie"
      ? clean(profile.profile_photo_url)
      : "";
  const verifiedSelfieUrl =
    selfieStatus === "verified"
      ? selectedSelfieUrl || evidenceSelfieUrl
      : "";

  const registeredName =
    clean(profile.display_name) ||
    clean(profile.full_name) ||
    clean(metadata.full_name) ||
    clean(metadata.name) ||
    clean(user.email?.split("@")[0]) ||
    "3Bigha Member";

  const businessName = clean(business.business_name);
  /*
   * CRS-6B1
   *
   * nature_of_business contains legacy module/capability keys.
   * It must never be interpreted as canonical identity data.
   *
   * Canonical identities are resolved exclusively through
   * loadMemberCanonicalIdentityKeys().
   */
  const businessIdentity = stringArray(
    business.business_identities
  );
  const individualIdentity = stringArray(
    business.individual_identities
  );

  const memberIdentitySources =
    await loadMemberCanonicalIdentityKeys(
      supabase,
      user.id
    );

  const [
    identityProjection,
    operatingProjection,
  ] = await Promise.all([
    loadIdentityProjectionSet(
      supabase,
      memberIdentitySources.allIdentityKeys
    ),
    loadOperatingCapabilityProjection(
      supabase,
      memberIdentitySources.allIdentityKeys
    ),
  ]);

  const canonicalDefaultPath =
    identityProjection.dashboardPaths.length === 1
      ? identityProjection.dashboardPaths[0]
      : identityProjection.unifiedWorkspacePaths[0] ||
        "/dashboard/workspace";

  const canonicalUnifiedPath =
    identityProjection.unifiedWorkspacePaths[0] ||
    "/dashboard/workspace";

  const hasCanonicalIdentity =
    identityProjection.identities.length > 0;

  /*
   * CRS-5C2 LEGACY COMPATIBILITY BRIDGE
   *
   * Existing production members predate canonical identity
   * persistence. Until they explicitly acquire canonical
   * identity keys, preserve their existing dashboard contract
   * through the established Access resolver.
   *
   * This fallback is deliberately centralized here.
   * Post-login and /dashboard must not recreate role routing.
   */
  const compatibilityDefaultPath =
    getDefaultPostLoginPath(access);

  const projectedNavigationModules =
    hasCanonicalIdentity
      ? identityProjection.navigationModules
      : access.vendorCapabilities;

  const businessVerification = normalizeVerification(
    business.business_verification_status ||
      business.verification_status ||
      business.approval_status
  );
  const verifiedSelfie =
    Boolean(verifiedSelfieUrl) && selfieStatus === "verified";
  const verifiedHuman = verifiedSelfie;
  const verifiedBusiness = businessVerification === "verified";

  return {
    userId: user.id,
    email: user.email || null,
    registeredName,
    primaryRole: roleLabel(profile.role || access.role),
    verifiedHuman,
    verifiedBusiness,
    verifiedSelfie,
    verifiedSelfieUrl,
    businessConstitution: clean(
      business.business_type || business.legal_constitution
    ),
    businessIdentity,
    individualIdentity,
    businessName,
    verificationStatus: {
      human: verifiedHuman ? "verified" : selfieStatus,
      selfie: selfieStatus,
      business: businessVerification,
    },
    approvalStatus: clean(
      business.approval_status || business.status || "not_started"
    ),
    completionStatus: resolveCompletion(profile, business),
    workspaceProjection: {
      defaultPath:
        hasCanonicalIdentity
          ? canonicalDefaultPath
          : compatibilityDefaultPath,
      unifiedPath: canonicalUnifiedPath,
      capabilities: access.vendorCapabilities,
    },
    operatingProjection,
    marketplaceProjection: {
      visible: verifiedBusiness && Boolean(businessName),
      businessName,
      businessIdentities: businessIdentity,
    },
    navigationProjection: buildProjectedNavigation(
      projectedNavigationModules,
      canonicalUnifiedPath,
      access
    ),
    permissionProjection: access,
    profile,
    businessProfile: business,
  };
}
