import type { SupabaseClient, User } from "@supabase/supabase-js";

import { repairCompatibilityGrantsForUser } from "@/lib/access/resolveAccess";
import { resolveCanonicalIdentity } from "@/lib/identity/resolveCanonicalIdentity";
import { resolveRegistrationState } from "@/lib/registration/resolveRegistrationState";
import type {
  MobileBootstrap,
  MobileDashboardKey,
  MobileRequiredAction,
} from "@/lib/mobile/contracts/v1";

export function resolveMobileDashboardKey(path: string): MobileDashboardKey {
  if (path.startsWith("/admin/dashboard")) return "admin_home";
  if (path.startsWith("/admin/blog")) return "blog_admin_home";
  if (path.startsWith("/dashboard/banker")) return "banker_home";
  if (path.startsWith("/dashboard/investor")) return "investor_home";
  if (path.startsWith("/dashboard/vendor")) return "vendor_home";
  if (path.startsWith("/blog/my")) return "publisher_home";
  return "buyer_home";
}

function requiredActionForState(state: string): MobileRequiredAction {
  switch (state) {
    case "ROLE_SELECTION_REQUIRED":
      return "select_role";
    case "BASIC_PROFILE_REQUIRED":
      return "complete_basic_profile";
    case "BUSINESS_PROFILE_REQUIRED":
      return "complete_business_profile";
    case "PROFILE_SETUP_REQUIRED":
      return "complete_profile_setup";
    case "GROWTH_PLAN_REQUIRED":
      return "review_growth_plan";
    case "ACCOUNT_BLOCKED":
      return "contact_support";
    default:
      return "none";
  }
}

export async function buildMobileBootstrap(
  supabase: SupabaseClient,
  user: User
): Promise<MobileBootstrap> {
  // This is the explicit trusted boundary for legacy compatibility repair.
  await repairCompatibilityGrantsForUser(supabase, user.id);

  const canonical = await resolveCanonicalIdentity(supabase, user);
  const profile = canonical.profile;
  const business = canonical.businessProfile;
  const role = canonical.permissionProjection.role;
  const isBusinessRole = Boolean(
    canonical.permissionProjection.isVendor ||
      canonical.permissionProjection.isBuilder ||
      canonical.permissionProjection.isHubVendor
  );
  const basicComplete = Boolean(
    String(profile.display_name || profile.full_name || "").trim() &&
      (String(profile.phone || "").trim() || user.email) &&
      String(profile.state || business.state || "").trim()
  );
  const locationVerified =
    business.location_verified === true ||
    String(business.location_verification_status || "").toLowerCase() === "verified";
  const registration = resolveRegistrationState({
    role,
    accountStatus: String(profile.account_status || "active"),
    basicComplete,
    onboardingReady:
      profile.onboarding_completed === true && Number(profile.onboarding_version || 0) >= 2,
    isBusinessRole,
    hasVendorCapabilities: canonical.permissionProjection.vendorCapabilities.length > 0,
    businessProfileComplete:
      business.business_profile_complete === true || business.is_complete === true,
    registrationComplete: business.registration_complete === true,
    locationVerified,
    eligibleFree:
      typeof business.eligible_free === "boolean" ? business.eligible_free : null,
  });
  const primaryWebPath = canonical.workspaceProjection.defaultPath;

  return {
    person: {
      id: canonical.userId,
      email: canonical.email,
      displayName: canonical.registeredName,
    },
    registration: {
      state: registration.state,
      reason: registration.reason,
      completion: canonical.completionStatus,
      requiredAction: requiredActionForState(registration.state),
    },
    identity: {
      primaryRole: canonical.primaryRole,
      businessName: canonical.businessName,
      businessIdentityKeys: canonical.businessIdentity,
      individualIdentityKeys: canonical.individualIdentity,
      approvalStatus: canonical.approvalStatus,
      verification: canonical.verificationStatus,
    },
    navigation: {
      primaryDashboard: resolveMobileDashboardKey(primaryWebPath),
      primaryWebPath,
      unifiedWorkspacePath: canonical.workspaceProjection.unifiedPath,
      items: canonical.navigationProjection.map((item) => ({
        key: item.key,
        label: item.label,
        webPath: item.href,
      })),
    },
    capabilities: {
      legacy: canonical.permissionProjection.vendorCapabilities,
      operating: canonical.operatingProjection.capabilityKeys,
      groups: canonical.operatingProjection.groups,
    },
  };
}
