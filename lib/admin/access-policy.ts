export const ADMIN_ROLES = [
  "master_admin",
  "property_admin",
  "materials_admin",
  "services_admin",
  "rentals_admin",
  "blog_admin",
  "investment_admin",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminCapability =
  | "admin:dashboard"
  | "admin:users"
  | "admin:registration"
  | "admin:property"
  | "admin:materials"
  | "admin:services"
  | "admin:rentals"
  | "admin:blog"
  | "admin:investment"
  | "admin:geography"
  | "admin:marketplace"
  | "admin:operations"
  | "admin:configuration";

const DELEGATED_CAPABILITIES: Record<Exclude<AdminRole, "master_admin">, readonly AdminCapability[]> = {
  property_admin: ["admin:dashboard", "admin:property"],
  materials_admin: ["admin:dashboard", "admin:materials"],
  services_admin: ["admin:dashboard", "admin:services"],
  rentals_admin: ["admin:dashboard", "admin:rentals"],
  blog_admin: ["admin:dashboard", "admin:blog"],
  investment_admin: ["admin:dashboard", "admin:investment"],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return ADMIN_ROLES.includes(String(value) as AdminRole);
}

export function adminRoleHasCapability(
  role: string | null | undefined,
  capability: AdminCapability
) {
  if (role === "master_admin") return true;
  if (!isAdminRole(role)) return false;
  const delegatedRole = role as Exclude<AdminRole, "master_admin">;
  return DELEGATED_CAPABILITIES[delegatedRole].includes(capability);
}

export function requiredAdminCapabilityForPath(pathname: string): AdminCapability {
  if (pathname === "/admin" || pathname === "/admin/dashboard") {
    return "admin:dashboard";
  }
  if (pathname.startsWith("/admin/property")) return "admin:property";
  if (pathname.startsWith("/admin/materials")) return "admin:materials";
  if (pathname.startsWith("/admin/services")) return "admin:services";
  if (pathname.startsWith("/admin/rentals")) return "admin:rentals";
  if (pathname.startsWith("/admin/blog")) return "admin:blog";
  if (pathname.startsWith("/admin/dashboard/investment")) return "admin:investment";
  if (pathname.startsWith("/admin/users")) return "admin:users";
  if (
    pathname.startsWith("/admin/verification") ||
    pathname.startsWith("/admin/individual-professional-reviews")
  ) {
    return "admin:registration";
  }
  if (pathname.startsWith("/admin/dashboard/geography")) return "admin:geography";
  if (
    pathname.startsWith("/admin/dashboard/marketplace-intelligence") ||
    pathname.startsWith("/admin/dashboard/vendor-control") ||
    pathname.startsWith("/admin/dashboard/vendor-recruitment")
  ) {
    return "admin:marketplace";
  }
  if (pathname.startsWith("/admin/dashboard/operations")) return "admin:operations";
  return "admin:configuration";
}

export function adminRoleCanAccessPath(
  role: string | null | undefined,
  pathname: string
) {
  return adminRoleHasCapability(role, requiredAdminCapabilityForPath(pathname));
}
