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

export type MobilePropertyWorkspaceProject = {
  id: string;
  name: string;
  slug: string;
  projectKind: string;
  status: string;
  city: string;
  district: string;
  state: string;
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  soldUnits: number;
  pricedUnits: number;
  trustedUnits: number;
  webPath: string;
};

export type MobilePropertyWorkspace = {
  generatedAt: string;
  access: {
    canManageOwnerListings: boolean;
    canManageBuilderProjects: boolean;
  };
  destinations: {
    ownerListings: "/property/my";
    builderProjects: "/property/builder/projects";
    buyerProjects: "/property/projects";
    buyerInventory: "/property/inventory";
  };
  owner: {
    totalListings: number;
    draftListings: number;
    pendingListings: number;
    approvedListings: number;
    rejectedListings: number;
  };
  builder: {
    totalProjects: number;
    activeProjects: number;
    totalUnits: number;
    availableUnits: number;
    reservedUnits: number;
    soldUnits: number;
    pricedUnits: number;
    trustedUnits: number;
    projects: MobilePropertyWorkspaceProject[];
  };
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

export async function loadPropertyWorkspace(session: Session): Promise<MobilePropertyWorkspace> {
  return mobileApiRequest(session, "/api/v1/mobile/property-workspace", {}, "Your property workspace could not be prepared.");
}
