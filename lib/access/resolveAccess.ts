// lib/access/resolveAccess.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type PortalRole =
  | "guest"
  | "buyer"
  | "vendor"
  | "blogger"
  | "blog_admin"
  | "master_admin";

export type VendorModuleKey = "property" | "materials" | "services" | "rentals";

export type AccessContext = {
  userId: string;
  email: string | null;

  role: PortalRole | null;
  isAdmin: boolean;
  isBlogAdmin: boolean;
  isBuyer: boolean;
  isVendor: boolean;

  vendorModules: VendorModuleKey[];
  vendorHasFullAccess: boolean;
};

function normalizeRole(raw: unknown): PortalRole | null {
  const v = String(raw ?? "").trim().toLowerCase();

  if (!v) return null;
  if (v === "buyer") return "buyer";
  if (v === "vendor") return "vendor";
  if (v === "blogger") return "blogger";
  if (v === "blog_admin") return "blog_admin";
  if (v === "master_admin") return "master_admin";

  return null;
}

function uniqueModules(values: string[]): VendorModuleKey[] {
  const allowed: VendorModuleKey[] = ["property", "materials", "services", "rentals"];
  const set = new Set<VendorModuleKey>();

  for (const v of values) {
    if ((allowed as string[]).includes(v)) set.add(v as VendorModuleKey);
  }

  return Array.from(set);
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
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
  let vendorModules: VendorModuleKey[] = [];

  const [profSettled, bpSettled] = await Promise.allSettled([
    withTimeout(
      supabase
        .from("profiles")
        .select("role,is_vendor")
        .eq("id", userId)
        .maybeSingle(),
      3500,
      "profiles lookup"
    ),
    withTimeout(
      supabase
        .from("business_profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle(),
      3500,
      "business_profiles lookup"
    ),
  ]);

  if (profSettled.status === "fulfilled") {
    const profRes: any = profSettled.value;
    if (!profRes?.error && profRes?.data) {
      role = normalizeRole(profRes.data.role);

      if (role === "vendor" || profRes.data.is_vendor === true) {
        isVendor = true;
      }
    }
  }

  if (bpSettled.status === "fulfilled") {
    const bpRes: any = bpSettled.value;
    if (!bpRes?.error && bpRes?.data?.user_id) {
      isVendor = true;
    }
  }

  if (isVendor) {
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
      vendorModules = uniqueModules(
        grantsRes.data
          .map((x: any) => String(x.module_key ?? "").trim().toLowerCase())
          .filter(Boolean)
      );
    }

    if (vendorModules.length === 0) {
      vendorModules = ["property", "materials", "services", "rentals"];
    }

    if (!role) role = "vendor";
  }

  const isAdmin = role === "master_admin";
  const isBlogAdmin = role === "blog_admin" || role === "master_admin";
  const isBuyer = role === "buyer";
  const vendorHasFullAccess =
    vendorModules.includes("property") &&
    vendorModules.includes("materials") &&
    vendorModules.includes("services") &&
    vendorModules.includes("rentals");

  return {
    userId,
    email: email ?? null,
    role,
    isAdmin,
    isBlogAdmin,
    isBuyer,
    isVendor,
    vendorModules,
    vendorHasFullAccess,
  };
}

export function getDefaultPostLoginPath(access: AccessContext): string {
  if (access.isAdmin) return "/admin/dashboard";
  if (access.isBlogAdmin) return "/admin/blog";

  if (access.isVendor) {
    if (access.vendorModules.length === 1) {
      const m = access.vendorModules[0];
      if (m === "property") return "/property/my";
      if (m === "materials") return "/materials/my";
      if (m === "services") return "/services/my";
      if (m === "rentals") return "/rentals/my";
    }
    return "/vendor/inbox-v2";
  }

  if (access.isBuyer) return "/dashboard/buyer";
  if (access.role === "blogger") return "/blog/my";

  return "/dashboard";
}