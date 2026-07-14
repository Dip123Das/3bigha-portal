import type { GrowthPlanKey } from "../capability";
import type {
  EntitlementDecision,
  EntitlementDecisionCode,
  EntitlementVerificationRequirement,
} from "./types";

export type AccessPresentationTone =
  | "positive"
  | "informational"
  | "attention"
  | "upgrade"
  | "verification"
  | "unavailable";

export type AccessPresentationAction = {
  label: string;
  href: string | null;
  kind: "primary" | "secondary" | "manual_alternative";
};

export type AccessPresentation = {
  decision: EntitlementDecisionCode;
  tone: AccessPresentationTone;
  badge: string;
  title: string;
  message: string;
  detail: string | null;
  availableNow: boolean;
  showUpgrade: boolean;
  showVerification: boolean;
  showUsage: boolean;
  manualAlternative: string | null;
  primaryAction: AccessPresentationAction | null;
  secondaryAction: AccessPresentationAction | null;
  planLabel: string;
  requiredPlanLabel: string | null;
  usageLabel: string | null;
  verificationLabel: string | null;
  aiDisclosure: string | null;
};

const PLAN_LABELS: Readonly<Record<GrowthPlanKey, string>> = Object.freeze({
  start: "Start",
  grow: "Grow",
  manage: "Manage",
  scale: "Scale",
});

const VERIFICATION_LABELS: Readonly<
  Record<EntitlementVerificationRequirement, string>
> = Object.freeze({
  identity: "identity verification",
  business: "business verification",
  location: "location verification",
});

function formatList(values: readonly string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function usageLabel(
  usage: EntitlementDecision["usage"]
): string | null {
  if (!usage || usage.limit == null) return null;

  if (usage.remaining === 0) {
    return `${usage.used} of ${usage.limit} used — limit reached`;
  }

  return `${usage.used} of ${usage.limit} used — ${usage.remaining} remaining`;
}

function verificationLabel(
  values: readonly EntitlementVerificationRequirement[]
): string | null {
  if (values.length === 0) return null;

  return `Complete ${formatList(
    values.map((value) => VERIFICATION_LABELS[value])
  )}.`;
}

function common(input: EntitlementDecision) {
  return {
    decision: input.decision,
    availableNow: input.allowed,
    manualAlternative: input.freeAlternative,
    planLabel: PLAN_LABELS[input.currentPlan],
    requiredPlanLabel: input.requiredPlan
      ? PLAN_LABELS[input.requiredPlan]
      : null,
    usageLabel: usageLabel(input.usage),
    verificationLabel: verificationLabel(
      input.missingVerification
    ),
    aiDisclosure: input.aiAssisted
      ? "AI prepares or assists. You review and decide."
      : null,
  };
}

function manualAction(
  input: EntitlementDecision
): AccessPresentationAction | null {
  if (!input.freeAlternative) return null;

  return {
    label: input.freeAlternative,
    href: null,
    kind: "manual_alternative",
  };
}

export function presentEntitlementDecision(
  input: EntitlementDecision
): AccessPresentation {
  const shared = common(input);
  const manual = manualAction(input);

  switch (input.decision) {
    case "allowed":
      return Object.freeze({
        ...shared,
        tone: "positive",
        badge: "Available",
        title: input.label,
        message: "This capability is available in your current workspace.",
        detail: input.reason,
        showUpgrade: false,
        showVerification: false,
        showUsage: false,
        primaryAction: null,
        secondaryAction: manual,
      });

    case "allowed_with_limit":
      return Object.freeze({
        ...shared,
        tone: "informational",
        badge: "Available with plan limit",
        title: input.label,
        message:
          "You can use this capability within your current plan allowance.",
        detail: shared.usageLabel,
        showUpgrade: false,
        showVerification: false,
        showUsage: true,
        primaryAction: null,
        secondaryAction: manual,
      });

    case "upgrade_required":
      return Object.freeze({
        ...shared,
        tone: "upgrade",
        badge: shared.requiredPlanLabel
          ? `Available in ${shared.requiredPlanLabel}`
          : "Plan upgrade required",
        title: input.label,
        message: input.aiAssisted
          ? "This optional AI assistance is not included in your current plan."
          : "This advanced capability is not included in your current plan.",
        detail: input.freeAlternative
          ? `You can continue without upgrading: ${input.freeAlternative}`
          : input.reason,
        showUpgrade: true,
        showVerification: false,
        showUsage: false,
        primaryAction: {
          label: shared.requiredPlanLabel
            ? `Explore ${shared.requiredPlanLabel}`
            : "View growth plans",
          href: input.upgradeHref,
          kind: "primary" as const,
        },
        secondaryAction: manual,
      });

    case "verification_required":
      return Object.freeze({
        ...shared,
        tone: "verification",
        badge: "Verification required",
        title: input.label,
        message:
          "This capability requires additional trust verification. Payment does not replace verification.",
        detail: shared.verificationLabel,
        showUpgrade: false,
        showVerification: true,
        showUsage: false,
        primaryAction: {
          label: "Complete verification",
          href: "/onboarding/business",
          kind: "primary" as const,
        },
        secondaryAction: manual,
      });

    case "role_not_applicable":
      return Object.freeze({
        ...shared,
        tone: "informational",
        badge: "Not relevant to this identity",
        title: input.label,
        message:
          "This capability is designed for a different kind of human or business activity.",
        detail:
          "Your identity remains unchanged. Select or establish the relevant business identity only when it genuinely reflects your work.",
        showUpgrade: false,
        showVerification: false,
        showUsage: false,
        primaryAction: null,
        secondaryAction: manual,
      });

    case "workspace_not_applicable":
      return Object.freeze({
        ...shared,
        tone: "informational",
        badge: "Available in another workspace",
        title: input.label,
        message:
          "This capability does not belong to the active workspace.",
        detail:
          "Switch to the relevant workspace without changing your identity or subscription.",
        showUpgrade: false,
        showVerification: false,
        showUsage: false,
        primaryAction: {
          label: "View workspaces",
          href: "/dashboard",
          kind: "secondary" as const,
        },
        secondaryAction: manual,
      });

    case "subscription_inactive":
      return Object.freeze({
        ...shared,
        tone: "attention",
        badge: "Subscription inactive",
        title: input.label,
        message:
          "Your paid subscription is inactive or has expired.",
        detail: input.freeAlternative
          ? `Your manual alternative remains available: ${input.freeAlternative}`
          : "Review your plan status to restore paid capabilities.",
        showUpgrade: true,
        showVerification: false,
        showUsage: false,
        primaryAction: {
          label: "Review subscription",
          href: input.upgradeHref,
          kind: "primary" as const,
        },
        secondaryAction: manual,
      });

    case "usage_exhausted":
      return Object.freeze({
        ...shared,
        tone: "attention",
        badge: "Plan limit reached",
        title: input.label,
        message:
          "You have used the current plan allowance for this capability.",
        detail: shared.usageLabel,
        showUpgrade: true,
        showVerification: false,
        showUsage: true,
        primaryAction: {
          label: "View higher capacity plans",
          href: input.upgradeHref,
          kind: "primary" as const,
        },
        secondaryAction: manual,
      });

    case "temporarily_unavailable":
      return Object.freeze({
        ...shared,
        tone: "unavailable",
        badge: "Temporarily unavailable",
        title: input.label,
        message:
          "This capability is temporarily unavailable.",
        detail: input.freeAlternative
          ? `You can continue through the human-led alternative: ${input.freeAlternative}`
          : input.reason,
        showUpgrade: false,
        showVerification: false,
        showUsage: false,
        primaryAction: null,
        secondaryAction: manual,
      });
  }
}

export type CapabilityBadgePresentation = {
  label: string;
  tone: AccessPresentationTone;
  description: string;
};

export function presentCapabilityBadge(
  input: EntitlementDecision
): CapabilityBadgePresentation {
  const presentation = presentEntitlementDecision(input);

  return Object.freeze({
    label: presentation.badge,
    tone: presentation.tone,
    description: presentation.message,
  });
}

export function presentPlanAccessSummary(
  decisions: readonly EntitlementDecision[]
): {
  available: number;
  limited: number;
  upgrades: number;
  verification: number;
  unavailable: number;
} {
  return Object.freeze(
    decisions.reduce(
      (summary, decision) => {
        if (decision.decision === "allowed") {
          summary.available += 1;
        } else if (decision.decision === "allowed_with_limit") {
          summary.limited += 1;
        } else if (
          decision.decision === "upgrade_required" ||
          decision.decision === "usage_exhausted" ||
          decision.decision === "subscription_inactive"
        ) {
          summary.upgrades += 1;
        } else if (decision.decision === "verification_required") {
          summary.verification += 1;
        } else {
          summary.unavailable += 1;
        }

        return summary;
      },
      {
        available: 0,
        limited: 0,
        upgrades: 0,
        verification: 0,
        unavailable: 0,
      }
    )
  );
}
