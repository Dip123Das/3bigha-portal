import type {
  LegacyAccessRuntimeSource,
  LegacyBusinessProfileRuntimeSource,
  LegacyProfileRuntimeSource,
  ThreeBOSBootstrapResult,
  ThreeBOSBootstrapSource,
} from "./types";

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  return cleaned || null;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => cleanString(item))
        .filter((item): item is string => Boolean(item))
    )
  );
}

function firstString(
  ...values: unknown[]
): string | null {
  for (const value of values) {
    const cleaned = cleanString(value);

    if (cleaned) return cleaned;
  }

  return null;
}

function resolveUserId(
  source: ThreeBOSBootstrapSource
): {
  value: string | null;
  source: ThreeBOSBootstrapResult["evidence"]["userIdSource"];
} {
  const explicit = cleanString(source.userId);

  if (explicit) {
    return {
      value: explicit,
      source: "explicit",
    };
  }

  const profileId = cleanString(source.profile?.id);

  if (profileId) {
    return {
      value: profileId,
      source: "profile",
    };
  }

  return {
    value: null,
    source: "none",
  };
}

function resolveRole(input: {
  profile?: LegacyProfileRuntimeSource | null;
  access?: LegacyAccessRuntimeSource | null;
}): {
  value: string | null;
  source: ThreeBOSBootstrapResult["evidence"]["roleSource"];
} {
  const accessRole = cleanString(input.access?.role);

  if (accessRole) {
    return {
      value: accessRole,
      source: "access",
    };
  }

  const profileRole = cleanString(input.profile?.role);

  if (profileRole) {
    return {
      value: profileRole,
      source: "profile",
    };
  }

  const requestedRole = cleanString(
    input.profile?.requested_role
  );

  if (requestedRole) {
    return {
      value: requestedRole,
      source: "requested_role",
    };
  }

  return {
    value: null,
    source: "none",
  };
}

function resolveModules(input: {
  businessProfile?:
    | LegacyBusinessProfileRuntimeSource
    | null;
  access?: LegacyAccessRuntimeSource | null;
}): {
  values: string[];
  sources: string[];
} {
  const values: string[] = [];
  const sources: string[] = [];

  const candidates: Array<{
    name: string;
    value: unknown;
  }> = [
    {
      name: "access.moduleKeys",
      value: input.access?.moduleKeys,
    },
    {
      name: "access.modules",
      value: input.access?.modules,
    },
    {
      name: "businessProfile.module_keys",
      value: input.businessProfile?.module_keys,
    },
    {
      name: "businessProfile.selected_modules",
      value: input.businessProfile?.selected_modules,
    },
  ];

  for (const candidate of candidates) {
    const list = normalizeStringList(candidate.value);

    if (list.length === 0) continue;

    values.push(...list);
    sources.push(candidate.name);
  }

  return {
    values: Array.from(new Set(values)),
    sources,
  };
}

function resolvePlan(input: {
  businessProfile?:
    | LegacyBusinessProfileRuntimeSource
    | null;
  access?: LegacyAccessRuntimeSource | null;
}): {
  value: string;
  source: ThreeBOSBootstrapResult["evidence"]["planSource"];
} {
  const accessPlan = firstString(
    input.access?.planKey,
    input.access?.plan
  );

  if (accessPlan) {
    return {
      value: accessPlan,
      source: "access",
    };
  }

  const growthPlan = cleanString(
    input.businessProfile?.growth_plan
  );

  if (growthPlan) {
    return {
      value: growthPlan,
      source: "growth_plan",
    };
  }

  const currentPlan = cleanString(
    input.businessProfile?.current_plan
  );

  if (currentPlan) {
    return {
      value: currentPlan,
      source: "current_plan",
    };
  }

  const subscriptionPlan = cleanString(
    input.businessProfile?.subscription_plan
  );

  if (subscriptionPlan) {
    return {
      value: subscriptionPlan,
      source: "subscription_plan",
    };
  }

  const planKey = cleanString(
    input.businessProfile?.plan_key
  );

  if (planKey) {
    return {
      value: planKey,
      source: "plan_key",
    };
  }

  const plan = cleanString(
    input.businessProfile?.plan
  );

  if (plan) {
    return {
      value: plan,
      source: "plan",
    };
  }

  return {
    value: "free",
    source: "default",
  };
}

export function create3BOSRuntimeInputFromLegacy(
  source: ThreeBOSBootstrapSource
): ThreeBOSBootstrapResult {
  const userId = resolveUserId(source);

  const role = resolveRole({
    profile: source.profile,
    access: source.access,
  });

  const modules = resolveModules({
    businessProfile: source.businessProfile,
    access: source.access,
  });

  const natureOfBusiness = normalizeStringList(
    source.businessProfile?.nature_of_business
  );

  const plan = resolvePlan({
    businessProfile: source.businessProfile,
    access: source.access,
  });

  return {
    input: {
      userId: userId.value,
      role: role.value,
      portalUseReason:
        cleanString(
          source.profile?.portal_use_reason
        ),
      moduleKeys: modules.values,
      natureOfBusiness,
      businessType:
        cleanString(
          source.businessProfile?.business_type
        ),
      legacyPlan: plan.value,
      preferredWorkspaceKey:
        cleanString(
          source.preferredWorkspaceKey
        ),
    },

    evidence: {
      userIdSource: userId.source,
      roleSource: role.source,
      planSource: plan.source,
      moduleSources: modules.sources,
      businessActivitySource:
        natureOfBusiness.length > 0
          ? "nature_of_business"
          : "none",
    },

    compatibility: {
      sourceRowsChanged: false,
      databaseMutation: false,
      permissionDecision: false,
      routingDecision: false,
    },
  };
}
