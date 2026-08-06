import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  resolveAccessForUser,
  type AccessContext,
  type VendorCapabilityKey,
} from "@/lib/access/resolveAccess";

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

function resolveDefaultWorkspacePath(access: AccessContext) {
  if (access.isAdmin) return "/admin/dashboard";

  if (
    access.role === "banker" ||
    access.role === "finance_banker"
  ) {
    return "/dashboard/banker";
  }

  if (access.role === "hub_vendor") return "/dashboard";

  if (
    access.role === "vendor" ||
    access.role === "builder" ||
    access.role === "blogger"
  ) {
    return "/dashboard/vendor";
  }

  return "/dashboard";
}

function buildNavigation(access: AccessContext): CanonicalNavigationItem[] {
  if (access.isAdmin) {
    return [
      { key: "admin", label: "Admin Dashboard", href: "/admin/dashboard" },
      { key: "workspace", label: "Unified Workspace", href: "/dashboard/workspace" },
      { key: "profile", label: "My Identity", href: "/settings" },
    ];
  }

  const items: CanonicalNavigationItem[] = [
    { key: "workspace", label: "Unified Workspace", href: "/dashboard/workspace" },
    { key: "profile", label: "My Identity", href: "/settings" },
  ];

  if (access.vendorCapabilities.includes("materials")) {
    items.push({
      key: "materials",
      label: "Materials",
      href: "/dashboard/vendor/materials",
    });
  }
  if (access.vendorCapabilities.includes("services")) {
    items.push({
      key: "services",
      label: "Services",
      href: "/dashboard/vendor/services",
    });
  }
  if (access.vendorCapabilities.includes("rentals")) {
    items.push({
      key: "rentals",
      label: "Rentals",
      href: "/dashboard/vendor/rentals",
    });
  }
  if (
    access.vendorCapabilities.includes("property_owner") ||
    access.vendorCapabilities.includes("property_builder")
  ) {
    items.push({
      key: "property",
      label: "Property",
      href: "/dashboard/vendor/property",
    });
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
  const businessIdentity = stringArray(
    business.business_identities || business.nature_of_business
  );
  const individualIdentity = stringArray(
    business.individual_identities
  );
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
      defaultPath: resolveDefaultWorkspacePath(access),
      unifiedPath: "/dashboard/workspace",
      capabilities: access.vendorCapabilities,
    },
    marketplaceProjection: {
      visible: verifiedBusiness && Boolean(businessName),
      businessName,
      businessIdentities: businessIdentity,
    },
    navigationProjection: buildNavigation(access),
    permissionProjection: access,
    profile,
    businessProfile: business,
  };
}
