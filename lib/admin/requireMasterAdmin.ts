import { requireAdminAccess } from "@/lib/admin/requireAdminAccess";

export async function requireMasterAdmin(request?: Request) {
  return requireAdminAccess({ request, allowedRoles: ["master_admin"] });
}
