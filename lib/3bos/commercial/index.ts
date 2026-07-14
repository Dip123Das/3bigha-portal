import {
  getGrowthPlan,
  resolveLegacyGrowthPlan,
  type CapabilityKey,
  type CapabilityLevel,
  type GrowthPlanKey,
  type LegacyPlanKey,
} from "../capability";

/**
 * N-4A2 — Subscription Access Context Bridge
 *
 * Additive and observe-only.
 *
 * This module interprets the existing commercial subscription fields without
 * replacing legacy subscription logic, changing payment behaviour, enforcing
 * access, writing to the database, or redesigning any user interface.
 */

export type CommercialSubscriptionStatus =
  | "free"
  | "requested"
  | "active"
  | "expired"
  | "inactive"
  | "cancelled"
  | "unknown";

export type VerificationObservation = {
  email?: boolean | null;
  phone?: boolean | null;
  business?: boolean | null;
  location?: boolean | null;
  approval?: boolean | null;
};

export type SubscriptionAccessContextInput = {
  humanId?: string | null;
  identityKey?: string | null;
  workspaceKey?: string | null;
  subscriptionPlan?: LegacyPlanKey | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | null;
  verification?: VerificationObservation | null;
  observedAt?: Date;
};

export type ObservedCapabilityAccess = {
  capability: CapabilityKey;
  level: CapabilityLevel;
  limit: number | null;
  description: string;
};

export type HumanAlternative = {
  key: "continue_current" | "complete_verification" | "review_growth_plan";
  label: string;
  description: string;
};

export type SubscriptionAccessContext = {
  mode: "observe_only";
  authoritative: false;
  human: { id: string | null };
  identity: { key: string | null };
  workspace: { key: string | null };
  commercialPlan: {
    legacyPlan: string;
    status: CommercialSubscriptionStatus;
    expiresAt: string | null;
    isCurrentlyActive: boolean;
    isPaidPlan: boolean;
  };
  growthPlan: {
    key: GrowthPlanKey;
    label: string;
    description: string;
    legacyAlias: boolean;
  };
  verification: {
    observations: VerificationObservation;
    complete: boolean;
    missing: Array<keyof VerificationObservation>;
  };
  capabilities: ObservedCapabilityAccess[];
  entitlements: {
    mode: "descriptive_only";
    grants: ObservedCapabilityAccess[];
  };
  humanAlternatives: HumanAlternative[];
  notes: string[];
};

const PAID_LEGACY_PLANS = new Set([
  "basic_vendor",
  "silver_vendor",
  "gold_vendor",
  "platinum_vendor",
  "premium_vendor",
  "hub_vendor",
]);

function normalizeStatus(value: unknown): CommercialSubscriptionStatus {
  const status = String(value ?? "free").trim().toLowerCase();

  if (
    status === "free" ||
    status === "requested" ||
    status === "active" ||
    status === "expired" ||
    status === "inactive" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "unknown";
}

function isFutureDate(value: string | null, now: Date): boolean {
  if (!value) return true;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > now.getTime();
}

function resolveVerification(
  input: VerificationObservation | null | undefined
): SubscriptionAccessContext["verification"] {
  const observations: VerificationObservation = {
    email: input?.email ?? null,
    phone: input?.phone ?? null,
    business: input?.business ?? null,
    location: input?.location ?? null,
    approval: input?.approval ?? null,
  };

  const keys = Object.keys(observations) as Array<keyof VerificationObservation>;
  const knownKeys = keys.filter((key) => observations[key] !== null);
  const missing = knownKeys.filter((key) => observations[key] !== true);

  return {
    observations,
    complete: knownKeys.length > 0 && missing.length === 0,
    missing,
  };
}

function resolveCapabilities(growthPlan: GrowthPlanKey): ObservedCapabilityAccess[] {
  const definition = getGrowthPlan(growthPlan);

  return Object.entries(definition.capabilities).flatMap(([key, value]) => {
    if (!value) return [];

    return [{
      capability: key as CapabilityKey,
      level: value.level,
      limit: value.limit ?? null,
      description: value.description,
    }];
  });
}

function buildHumanAlternatives(args: {
  status: CommercialSubscriptionStatus;
  isActive: boolean;
  verification: SubscriptionAccessContext["verification"];
}): HumanAlternative[] {
  const alternatives: HumanAlternative[] = [{
    key: "continue_current",
    label: "Continue with current access",
    description:
      "Keep using the existing production experience and current commercial access.",
  }];

  if (args.verification.missing.length > 0) {
    alternatives.push({
      key: "complete_verification",
      label: "Complete pending verification",
      description:
        "Strengthen trust and readiness by completing the verification steps already available.",
    });
  }

  if (args.status !== "requested" && !args.isActive) {
    alternatives.push({
      key: "review_growth_plan",
      label: "Review Growth Plans",
      description:
        "Review available plans without changing existing access or starting automatic enforcement.",
    });
  }

  return alternatives;
}

export function resolveSubscriptionAccessContext(
  input: SubscriptionAccessContextInput
): SubscriptionAccessContext {
  const now = input.observedAt ?? new Date();
  const planResolution = resolveLegacyGrowthPlan(input.subscriptionPlan);
  const growthPlan = getGrowthPlan(planResolution.growthPlan);
  const status = normalizeStatus(input.subscriptionStatus);
  const isFree = planResolution.legacyPlan === "free";
  const isCurrentlyActive =
    isFree ||
    (status === "active" &&
      isFutureDate(input.subscriptionExpiresAt ?? null, now));
  const verification = resolveVerification(input.verification);
  const capabilities = resolveCapabilities(planResolution.growthPlan);

  return {
    mode: "observe_only",
    authoritative: false,
    human: { id: input.humanId ?? null },
    identity: { key: input.identityKey ?? null },
    workspace: { key: input.workspaceKey ?? null },
    commercialPlan: {
      legacyPlan: planResolution.legacyPlan,
      status,
      expiresAt: input.subscriptionExpiresAt ?? null,
      isCurrentlyActive,
      isPaidPlan: PAID_LEGACY_PLANS.has(planResolution.legacyPlan),
    },
    growthPlan: {
      key: planResolution.growthPlan,
      label: growthPlan.label,
      description: growthPlan.description,
      legacyAlias: planResolution.isLegacyAlias,
    },
    verification,
    capabilities,
    entitlements: {
      mode: "descriptive_only",
      grants: capabilities,
    },
    humanAlternatives: buildHumanAlternatives({
      status,
      isActive: isCurrentlyActive,
      verification,
    }),
    notes: [
      "Existing subscription, pricing, payment, renewal and admin logic remain authoritative.",
      "Capability and entitlement information in this context is descriptive only.",
      "No access decision may be enforced from this bridge during N-4A2.",
      ...planResolution.notes,
    ],
  };
}