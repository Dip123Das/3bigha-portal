import { getWorkspace } from "./registry";
import type {
  WorkspaceDefinition,
  WorkspaceKey,
} from "./types";

export type RfqWorkspaceRouteId =
  | "rfq-entry"
  | "rfq-review"
  | "rfq-professional"
  | "buyer-rfq-management"
  | "vendor-rfq-inbox";

export type RfqWorkspaceRouteBinding = {
  id: RfqWorkspaceRouteId;
  pathname: string;
  match: "exact" | "prefix";
  workspaceKey: WorkspaceKey;
  purpose:
    | "capture-requirement"
    | "review-requirement"
    | "prepare-professional-rfq"
    | "manage-buyer-rfqs"
    | "manage-vendor-rfqs";
  journeyStage:
    | "capture"
    | "review"
    | "professional-preparation"
    | "waiting-for-vendors"
    | "respond";
  humanDecisionRequired: true;
  legacyCompatible: true;
  readOnly: true;
};

export type ResolvedRfqWorkspace = {
  binding: RfqWorkspaceRouteBinding;
  workspace: WorkspaceDefinition;
};

export const RFQ_WORKSPACE_ROUTE_BINDINGS: readonly RfqWorkspaceRouteBinding[] =
  Object.freeze([
    {
      id: "rfq-entry",
      pathname: "/rfq",
      match: "exact",
      workspaceKey: "customer",
      purpose: "capture-requirement",
      journeyStage: "capture",
      humanDecisionRequired: true,
      legacyCompatible: true,
      readOnly: true,
    },
    {
      id: "rfq-review",
      pathname: "/rfq/review",
      match: "exact",
      workspaceKey: "customer",
      purpose: "review-requirement",
      journeyStage: "review",
      humanDecisionRequired: true,
      legacyCompatible: true,
      readOnly: true,
    },
    {
      id: "rfq-professional",
      pathname: "/rfq/new",
      match: "exact",
      workspaceKey: "customer",
      purpose: "prepare-professional-rfq",
      journeyStage: "professional-preparation",
      humanDecisionRequired: true,
      legacyCompatible: true,
      readOnly: true,
    },
    {
      id: "rfq-professional",
      pathname: "/rfq/general/new",
      match: "exact",
      workspaceKey: "customer",
      purpose: "prepare-professional-rfq",
      journeyStage: "professional-preparation",
      humanDecisionRequired: true,
      legacyCompatible: true,
      readOnly: true,
    },
    {
      id: "buyer-rfq-management",
      pathname: "/dashboard/buyer/rfqs",
      match: "prefix",
      workspaceKey: "customer",
      purpose: "manage-buyer-rfqs",
      journeyStage: "waiting-for-vendors",
      humanDecisionRequired: true,
      legacyCompatible: true,
      readOnly: true,
    },
    {
      id: "buyer-rfq-management",
      pathname: "/dashboard/buyer/quote-compare",
      match: "prefix",
      workspaceKey: "customer",
      purpose: "manage-buyer-rfqs",
      journeyStage: "waiting-for-vendors",
      humanDecisionRequired: true,
      legacyCompatible: true,
      readOnly: true,
    },
    {
      id: "vendor-rfq-inbox",
      pathname: "/vendor/inbox-v2",
      match: "prefix",
      workspaceKey: "multi_business",
      purpose: "manage-vendor-rfqs",
      journeyStage: "respond",
      humanDecisionRequired: true,
      legacyCompatible: true,
      readOnly: true,
    },
    {
      id: "vendor-rfq-inbox",
      pathname: "/dashboard/vendor/rfqs",
      match: "prefix",
      workspaceKey: "multi_business",
      purpose: "manage-vendor-rfqs",
      journeyStage: "respond",
      humanDecisionRequired: true,
      legacyCompatible: true,
      readOnly: true,
    },
  ]);

function normalizePathname(pathname: string): string {
  const value = String(pathname || "").trim();

  if (!value) return "/";

  const withLeadingSlash = value.startsWith("/")
    ? value
    : `/${value}`;

  if (withLeadingSlash === "/") return "/";

  return withLeadingSlash.replace(/\/+$/, "");
}

export function resolveRfqWorkspace(
  pathname: string
): ResolvedRfqWorkspace | null {
  const normalized = normalizePathname(pathname);

  for (const binding of RFQ_WORKSPACE_ROUTE_BINDINGS) {
    const routePath = normalizePathname(binding.pathname);

    const matches =
      binding.match === "exact"
        ? normalized === routePath
        : normalized === routePath ||
          normalized.startsWith(`${routePath}/`);

    if (!matches) continue;

    return {
      binding,
      workspace: getWorkspace(binding.workspaceKey),
    };
  }

  return null;
}

export function requireRfqWorkspace(
  pathname: string
): ResolvedRfqWorkspace {
  const resolved = resolveRfqWorkspace(pathname);

  if (!resolved) {
    throw new Error(
      `No registered RFQ workspace route for path: ${pathname}`
    );
  }

  return resolved;
}
