import "server-only";

import { cookies } from "next/headers";
import { createClient, type User } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  adminRoleHasCapability,
  type AdminCapability,
  type AdminRole,
} from "@/lib/admin/access-policy";

type AdminAccessOptions = {
  request?: Request;
  capability?: AdminCapability;
  allowedRoles?: readonly AdminRole[];
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function bearerToken(request?: Request) {
  const header = request?.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function requireAdminAccess(options: AdminAccessOptions = {}) {
  const admin = getServiceClient();
  if (!admin) {
    return { error: "Missing server configuration", status: 500 } as const;
  }

  let user: User | null = null;
  const token = bearerToken(options.request);

  if (token) {
    const result = await admin.auth.getUser(token);
    user = result.data.user;
  } else {
    const cookieStore = await cookies();
    const sessionClient = getSupabaseServerClient(cookieStore);
    const result = await sessionClient.auth.getUser();
    user = result.data.user;
  }

  if (!user) return { error: "Unauthorized", status: 401 } as const;

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role,account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: "Could not verify administrative access", status: 500 } as const;
  }

  if (["deactivated", "permanently_blocked"].includes(profile?.account_status || "")) {
    return { error: "Account access is restricted", status: 403 } as const;
  }

  const role = String(profile?.role || "") as AdminRole;
  const roleAllowed = options.allowedRoles
    ? options.allowedRoles.includes(role)
    : true;
  const capabilityAllowed = options.capability
    ? adminRoleHasCapability(role, options.capability)
    : role === "master_admin";

  if (!roleAllowed || !capabilityAllowed) {
    return { error: "Forbidden", status: 403 } as const;
  }

  return { user, role, admin } as const;
}
