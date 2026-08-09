import type { Session } from "@supabase/supabase-js";

export type MobileDashboardKey =
  | "admin_home"
  | "blog_admin_home"
  | "banker_home"
  | "investor_home"
  | "vendor_home"
  | "publisher_home"
  | "buyer_home";

export type MobileBootstrap = {
  person: { id: string; email: string | null; displayName: string };
  registration: { state: string; reason: string; requiredAction: string };
  identity: { primaryRole: string; businessName: string; approvalStatus: string };
  navigation: {
    primaryDashboard: MobileDashboardKey;
    primaryWebPath: string;
    unifiedWorkspacePath: string;
    items: Array<{ key: string; label: string; webPath: string }>;
  };
  capabilities: { legacy: string[]; operating: string[]; groups: Record<string, string[]> };
};

function apiOrigin() {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!value) throw new Error("The approved 3Bigha API URL is not configured.");
  return value;
}

export function canonicalWebUrl(path: string) {
  return `${apiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function loadMobileBootstrap(session: Session): Promise<MobileBootstrap> {
  const response = await fetch(`${apiOrigin()}/api/v1/mobile/bootstrap`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    throw new Error(body?.error?.message || "Your workspace could not be prepared.");
  }
  return body.data as MobileBootstrap;
}
