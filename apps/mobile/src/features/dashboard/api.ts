import type { Session } from "@supabase/supabase-js";
import { canonicalApiUrl, mobileApiRequest } from "@/lib/api/request";

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

export type MobileDashboardAggregate = {
  dashboard: MobileDashboardKey;
  generatedAt: string;
  metrics: Array<{ key: string; label: string; value: number | null; webPath: string }>;
};

export function canonicalWebUrl(path: string) {
  return canonicalApiUrl(path);
}

export async function loadMobileBootstrap(session: Session): Promise<MobileBootstrap> {
  return mobileApiRequest(session, "/api/v1/mobile/bootstrap", {}, "Your workspace could not be prepared.");
}

export async function loadDashboardAggregate(session: Session): Promise<MobileDashboardAggregate> {
  return mobileApiRequest(session, "/api/v1/mobile/dashboard", {}, "Your work summary could not be prepared.");
}
