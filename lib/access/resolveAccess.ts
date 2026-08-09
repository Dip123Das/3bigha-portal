// lib/access/resolveAccess.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadIdentityProjectionSet,
} from "@/lib/identity/loadIdentityProjections";
import {
  loadMemberCanonicalIdentityKeys,
} from "@/lib/identity/loadMemberCanonicalIdentityKeys";

export type PortalRole =
  | "guest"
  | "buyer"
  | "vendor"
  | "builder"
  | "hub_vendor"
  | "blogger"
  | "blog_admin"
  | "banker"
  | "finance_banker"
  | "investor"
  | "master_admin";

export type VendorCapabilityKey =
  | "materials"
  | "services"
  | "rentals"
  | "property_owner"
  | "property_builder"
  | "blog_author"
  | "investor";

export type AccessContext = {
  userId: string;
  email: string | null;

  role: PortalRole | null;
  isAdmin: boolean;
  isBlogAdmin: boolean;
  isBuyer: boolean;
  isVendor: boolean;
  isBuilder: boolean;
  isHubVendor: boolean;

  vendorCapabilities: VendorCapabilityKey[];
  vendorHasFullAccess: boolean;
};

type CompatibilityGrantRepairResult = {
  insertedModules: VendorCapabilityKey[];
};

function normalizeRole(raw: unknown): PortalRole | null {
  const v = String(raw ?? "").trim().toLowerCase();

  if (!v) return null;
  if (v === "buyer") return "buyer";
  if (v === "vendor") return "vendor";
  if (v === "builder") return "builder";
  if (v === "hub_vendor") return "hub_vendor";
  if (v === "blogger") return "blogger";
  if (v === "blog_admin") return "blog_admin";
  if (v === "banker") return "banker";
  if (v === "finance_banker") return "finance_banker";
  if (v === "investor") return "investor";
  if (v === "master_admin") return "master_admin";

  return null;
}

function normalizeCapability(raw: unknown): VendorCapabilityKey | null {
  const v = String(raw ?? "").trim().toLowerCase();

  if (!v) return null;

  if (v === "materials") return "materials";
  if (v === "services") return "services";
  if (v === "rentals") return "rentals";
  if (v === "property_owner") return "property_owner";
  if (v === "property_builder") return "property_builder";
  if (v === "blog_author") return "blog_author";
  if (v === "investor") return "investor";

  if (v === "property") return "property_owner";
  if (v === "materials_vendor") return "materials";
  if (v === "services_vendor") return "services";
  if (v === "rentals_vendor") return "rentals";
  if (v === "owner") return "property_owner";
  if (v === "builder") return "property_builder";
  if (v === "author") return "blog_author";
  if (v === "investment" || v === "investor_access") return "investor";

  return null;
}

function uniqueCapabilities(values: unknown[]): VendorCapabilityKey[] {
  const set = new Set<VendorCapabilityKey>();

  for (const v of values) {
    const normalized = normalizeCapability(v);
    if (normalized) set.add(normalized);
  }

  return Array.from(set);
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function resolveAccessForUser(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<AccessContext> {
  let role: PortalRole | null = null;
  let isVendor = false;
  let isBuilder = false;
  let isHubVendor = false;
  let vendorCapabilities: VendorCapabilityKey[] = [];

  const [profSettled, bpSettled] = await Promise.allSettled([
    withTimeout(
      supabase
        .from("profiles")
        .select(
          "role,is_vendor,onboarding_completed,onboarding_version,portal_use_reason"
        )
        .eq("id", userId)
        .maybeSingle(),
      3500,
      "profiles lookup"
    ),
    withTimeout(
      supabase
        .from("business_profiles")
        .select(
          "user_id,business_identities,individual_identities"
        )
        .eq("user_id", userId)
        .maybeSingle(),
      3500,
      "business_profiles lookup"
    ),
  ]);

  let profile: any = null;

  if (profSettled.status === "fulfilled") {
    const profRes: any = profSettled.value;
    if (!profRes?.error && profRes?.data) {
      profile = profRes.data;
      role = normalizeRole(profile.role);

      if (role === "vendor") {
        isVendor = true;
      }

      if (role === "builder") {
        isBuilder = true;
      }

      if (role === "hub_vendor") {
        isHubVendor = true;
        isVendor = true;
      }

      if (role === "blogger") {
        isVendor = false;
      }
    }
  }

  let businessProfile: any = null;

  if (bpSettled.status === "fulfilled") {
    const bpRes: any = bpSettled.value;

    if (!bpRes?.error && bpRes?.data?.user_id) {
      businessProfile = bpRes.data;

      // Identity selection does not itself elevate the member role.
      // It only projects capabilities for an already-authorised role.
    }
  }

  if (isVendor || isBuilder || isHubVendor || role === "blogger") {
    const grantsSettled = await Promise.allSettled([
      withTimeout(
        supabase
          .from("vendor_module_grants")
          .select("module_key,is_active")
          .eq("user_id", userId)
          .eq("is_active", true),
        3000,
        "vendor_module_grants lookup"
      ),
    ]);

    const grantsRes: any =
      grantsSettled[0].status === "fulfilled" ? grantsSettled[0].value : null;

    if (!grantsRes?.error && Array.isArray(grantsRes?.data)) {
      vendorCapabilities = uniqueCapabilities(
        grantsRes.data.map((x: any) => x.module_key)
      );
    }

    if (!role && isVendor) role = "vendor";
  }

  const isAdmin = role === "master_admin";
  const isBlogAdmin = role === "blog_admin" || role === "master_admin";
  const isBuyer = role === "buyer";

  const vendorHasFullAccess =
    vendorCapabilities.includes("materials") &&
    vendorCapabilities.includes("services") &&
    vendorCapabilities.includes("rentals") &&
    vendorCapabilities.includes("property_owner") &&
    vendorCapabilities.includes("property_builder") &&
    vendorCapabilities.includes("blog_author") &&
    vendorCapabilities.includes("investor");

  return {
    userId,
    email: email ?? null,
    role,
    isAdmin,
    isBlogAdmin,
    isBuyer,
    isVendor,
    isBuilder,
    isHubVendor,
    vendorCapabilities,
    vendorHasFullAccess,
  };
}

/**
 * Server-only compatibility repair.
 *
 * Access resolution is intentionally read-only. Callers at a trusted server
 * boundary may invoke this repair before resolving access for legacy members.
 * The inserted values still come exclusively from canonical identity_master.
 */
export async function repairCompatibilityGrantsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<CompatibilityGrantRepairResult> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_completed,onboarding_version")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Compatibility profile lookup failed: ${profileError.message}`);
  }

  if (
    profile?.onboarding_completed !== true ||
    profile?.onboarding_version !== 2
  ) {
    return { insertedModules: [] };
  }

  const { data: existingRows, error: grantsError } = await supabase
    .from("vendor_module_grants")
    .select("module_key")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (grantsError) {
    throw new Error(`Compatibility grants lookup failed: ${grantsError.message}`);
  }

  if ((existingRows || []).length > 0) {
    return { insertedModules: [] };
  }

  const identitySources = await loadMemberCanonicalIdentityKeys(supabase, userId);
  const identityProjection = await loadIdentityProjectionSet(
    supabase,
    identitySources.allIdentityKeys
  );
  const modules = uniqueCapabilities(identityProjection.compatibilityModules);

  if (!modules.length) return { insertedModules: [] };

  const { error: insertError } = await supabase
    .from("vendor_module_grants")
    .insert(
      modules.map((module_key) => ({
        user_id: userId,
        module_key,
        is_active: true,
      }))
    );

  if (insertError) {
    throw new Error(`Compatibility grants repair failed: ${insertError.message}`);
  }

  return { insertedModules: modules };
}

export function getDefaultPostLoginPath(access: AccessContext): string {
  if (access.isAdmin) return "/admin/dashboard";
  if (access.isBlogAdmin) return "/admin/blog";

  // My Dashboard must resolve to the person's primary role dashboard.
  // Unified Workspace remains a secondary work-area chooser.
  if (access.role === "banker" || access.role === "finance_banker") {
    return "/dashboard/banker";
  }

  if (access.role === "investor") {
    return "/dashboard/investor";
  }

  if (access.isBuilder || access.isHubVendor || access.isVendor) {
    return "/dashboard/vendor";
  }

  if (access.role === "blogger") {
    return "/blog/my";
  }

  if (access.isBuyer) {
    return "/dashboard/buyer";
  }

  // Neutral signed-in accounts use the existing buyer dashboard fallback.
  return "/dashboard/buyer";
}
