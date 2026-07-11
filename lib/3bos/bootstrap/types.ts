import type { ThreeBOSRuntimeInput } from "../runtime";

export type LegacyProfileRuntimeSource = {
  id?: string | null;
  role?: string | null;
  requested_role?: string | null;
  portal_use_reason?: string | null;
  role_display_label?: string | null;
  is_vendor?: boolean | null;
};

export type LegacyBusinessProfileRuntimeSource = {
  business_type?: string | null;
  nature_of_business?: unknown;
  selected_modules?: unknown;
  module_keys?: unknown;

  plan?: string | null;
  plan_key?: string | null;
  subscription_plan?: string | null;
  current_plan?: string | null;
  growth_plan?: string | null;
};

export type LegacyAccessRuntimeSource = {
  role?: string | null;
  modules?: unknown;
  moduleKeys?: unknown;
  plan?: string | null;
  planKey?: string | null;
};

export type ThreeBOSBootstrapSource = {
  userId?: string | null;
  profile?: LegacyProfileRuntimeSource | null;
  businessProfile?: LegacyBusinessProfileRuntimeSource | null;
  access?: LegacyAccessRuntimeSource | null;
  preferredWorkspaceKey?: string | null;
};

export type ThreeBOSBootstrapResult = {
  input: ThreeBOSRuntimeInput;

  evidence: {
    userIdSource:
      | "explicit"
      | "profile"
      | "none";

    roleSource:
      | "access"
      | "profile"
      | "requested_role"
      | "none";

    planSource:
      | "access"
      | "growth_plan"
      | "current_plan"
      | "subscription_plan"
      | "plan_key"
      | "plan"
      | "default";

    moduleSources: string[];
    businessActivitySource:
      | "nature_of_business"
      | "none";
  };

  compatibility: {
    sourceRowsChanged: false;
    databaseMutation: false;
    permissionDecision: false;
    routingDecision: false;
  };
};
