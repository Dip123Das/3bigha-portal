import {
  resolveCapabilityForIdentityAndPlan,
} from "../capability";
import type { HumanAccessContext } from "../access-context";
import {
  capabilityLevelMeets,
  growthPlanMeets,
} from "./level-order";
import type {
  EntitlementActionPolicy,
  EntitlementDecision,
  EntitlementUsage,
  EntitlementVerificationRequirement,
} from "./types";

function decisionBase(input: {
  context: HumanAccessContext;
  policy: EntitlementActionPolicy;
}) {
  const { context, policy } = input;
  const primaryIdentity = context.primaryIdentity;

  const capabilityResolution = primaryIdentity
    ? resolveCapabilityForIdentityAndPlan({
        identity: primaryIdentity.key,
        capability: policy.parentCapability,
        plan: context.growthPlan,
      })
    : null;

  return {
    capabilityResolution,
    currentCapabilityLevel:
      capabilityResolution?.effectiveLevel ?? ("none" as const),
  };
}

function usageSnapshot(
  usage: EntitlementUsage | undefined,
  policyLimit: number | null | undefined
): EntitlementDecision["usage"] {
  const limit = usage?.limit ?? policyLimit ?? null;
  const used = Math.max(0, usage?.used ?? 0);

  if (limit == null) {
    return usage
      ? { used, limit: null, remaining: null }
      : null;
  }

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

function missingVerification(
  context: HumanAccessContext,
  required: readonly EntitlementVerificationRequirement[] | undefined
): EntitlementVerificationRequirement[] {
  const missing: EntitlementVerificationRequirement[] = [];

  for (const requirement of required ?? []) {
    if (
      requirement === "identity" &&
      !context.verification.identityVerified
    ) {
      missing.push(requirement);
    }

    if (
      requirement === "business" &&
      !context.verification.businessVerified
    ) {
      missing.push(requirement);
    }

    if (
      requirement === "location" &&
      !context.verification.locationVerified
    ) {
      missing.push(requirement);
    }
  }

  return missing;
}

function createDecision(input: {
  context: HumanAccessContext;
  policy: EntitlementActionPolicy;
  decision: EntitlementDecision["decision"];
  allowed: boolean;
  reason: string;
  currentCapabilityLevel: EntitlementDecision["currentCapabilityLevel"];
  usage?: EntitlementDecision["usage"];
  missingVerification?: readonly EntitlementVerificationRequirement[];
}): EntitlementDecision {
  const { context, policy } = input;

  return Object.freeze({
    decision: input.decision,
    allowed: input.allowed,

    action: policy.action,
    label: policy.label,
    parentCapability: policy.parentCapability,

    currentPlan: context.growthPlan,
    requiredPlan: policy.minimumPlan ?? null,

    currentCapabilityLevel: input.currentCapabilityLevel,
    requiredCapabilityLevel: policy.minimumCapabilityLevel ?? null,

    usage: input.usage ?? null,
    missingVerification: Object.freeze([
      ...(input.missingVerification ?? []),
    ]),

    reason: input.reason,
    freeAlternative: policy.freeAlternative ?? null,
    upgradeHref:
      input.decision === "upgrade_required" ||
      input.decision === "subscription_inactive" ||
      input.decision === "usage_exhausted"
        ? policy.upgradeHref ?? "/dashboard/subscription"
        : null,

    aiAssisted: Boolean(policy.aiAssisted),
    serverEnforced: Boolean(policy.serverEnforced),
    readOnly: true,
  });
}

export function resolveEntitlement(input: {
  context: HumanAccessContext;
  policy: EntitlementActionPolicy;
  usage?: EntitlementUsage;
}): EntitlementDecision {
  const { context, policy } = input;
  const base = decisionBase({ context, policy });
  const usage = usageSnapshot(input.usage, policy.limit);

  if (policy.temporarilyAvailable === false) {
    return createDecision({
      context,
      policy,
      decision: "temporarily_unavailable",
      allowed: false,
      currentCapabilityLevel: base.currentCapabilityLevel,
      usage,
      reason: "This capability is temporarily unavailable.",
    });
  }

  if (!context.primaryIdentity) {
    return createDecision({
      context,
      policy,
      decision: "role_not_applicable",
      allowed: false,
      currentCapabilityLevel: base.currentCapabilityLevel,
      usage,
      reason:
        "A clear Human Identity is required before this capability can be evaluated.",
    });
  }

  if (
    policy.applicableIdentities?.length &&
    !policy.applicableIdentities.includes(context.primaryIdentity.key)
  ) {
    return createDecision({
      context,
      policy,
      decision: "role_not_applicable",
      allowed: false,
      currentCapabilityLevel: base.currentCapabilityLevel,
      usage,
      reason:
        "This capability is not relevant to the selected Human Identity.",
    });
  }

  if (
    policy.applicableWorkspaces?.length &&
    (!context.activeWorkspace ||
      !policy.applicableWorkspaces.includes(context.activeWorkspace.key))
  ) {
    return createDecision({
      context,
      policy,
      decision: "workspace_not_applicable",
      allowed: false,
      currentCapabilityLevel: base.currentCapabilityLevel,
      usage,
      reason:
        "This capability is not available in the active Workspace.",
    });
  }

  if (
    context.subscriptionState === "expired" ||
    context.subscriptionState === "inactive"
  ) {
    return createDecision({
      context,
      policy,
      decision: "subscription_inactive",
      allowed: false,
      currentCapabilityLevel: base.currentCapabilityLevel,
      usage,
      reason:
        "The current paid subscription is inactive or has expired.",
    });
  }

  const missing = missingVerification(
    context,
    policy.verificationRequired
  );

  if (missing.length > 0) {
    return createDecision({
      context,
      policy,
      decision: "verification_required",
      allowed: false,
      currentCapabilityLevel: base.currentCapabilityLevel,
      usage,
      missingVerification: missing,
      reason:
        "Additional verification is required before this capability can be used.",
    });
  }

  if (
    policy.minimumPlan &&
    !growthPlanMeets(context.growthPlan, policy.minimumPlan)
  ) {
    return createDecision({
      context,
      policy,
      decision: "upgrade_required",
      allowed: false,
      currentCapabilityLevel: base.currentCapabilityLevel,
      usage,
      reason:
        "The current Growth Plan does not include this capability.",
    });
  }

  if (
    !base.capabilityResolution?.eligible ||
    base.capabilityResolution.identityLevel === "none"
  ) {
    return createDecision({
      context,
      policy,
      decision: "role_not_applicable",
      allowed: false,
      currentCapabilityLevel: base.currentCapabilityLevel,
      usage,
      reason:
        base.capabilityResolution?.reason ??
        "This capability is not relevant to the selected Human Identity.",
    });
  }

  if (
    policy.minimumCapabilityLevel &&
    !capabilityLevelMeets(
      base.currentCapabilityLevel,
      policy.minimumCapabilityLevel
    )
  ) {
    return createDecision({
      context,
      policy,
      decision: "upgrade_required",
      allowed: false,
      currentCapabilityLevel: base.currentCapabilityLevel,
      usage,
      reason:
        "The current effective capability level is below the required level.",
    });
  }

  if (
    usage?.limit != null &&
    usage.used >= usage.limit
  ) {
    return createDecision({
      context,
      policy,
      decision: "usage_exhausted",
      allowed: false,
      currentCapabilityLevel: base.currentCapabilityLevel,
      usage,
      reason:
        "The current plan usage limit has been reached.",
    });
  }

  if (usage?.limit != null) {
    return createDecision({
      context,
      policy,
      decision: "allowed_with_limit",
      allowed: true,
      currentCapabilityLevel: base.currentCapabilityLevel,
      usage,
      reason:
        "This capability is available within the current plan limit.",
    });
  }

  return createDecision({
    context,
    policy,
    decision: "allowed",
    allowed: true,
    currentCapabilityLevel: base.currentCapabilityLevel,
    usage,
    reason:
      "This capability is available for the current identity, workspace and Growth Plan.",
  });
}
