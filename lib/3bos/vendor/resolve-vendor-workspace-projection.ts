export type VendorWorkspaceTone =
  | "positive"
  | "attention"
  | "neutral";

export type VendorWorkspaceAction = {
  key: string;
  label: string;
  detail: string;
  href: string;
  priority: number;
  tone: VendorWorkspaceTone;
};

export type VendorWorkspaceProjectionInput = {
  dashboardTitle: string;
  profileComplete: boolean | null;
  profilePercent: number | null;
  activeCapabilities: string[];
  newLeadCount: number;
  unreadConversationCount: number;
  missedLeadCount: number;
  readyDealCount: number;
  unreadAlertCount: number;
  priceSignalCount: number;
  visibilityScore: number;
  replyRate: number;
  closeRate: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  recommendation?: string | null;
};

export type VendorWorkspaceProjection = {
  version: "v1b";
  identity: {
    title: string;
    capabilityCount: number;
    profilePercent: number;
    profileComplete: boolean;
  };
  readiness: {
    score: number;
    label: "Ready" | "Needs attention" | "Getting started";
  };
  workNow: VendorWorkspaceAction[];
  pulse: {
    newLeads: number;
    unreadConversations: number;
    missedLeads: number;
    readyDeals: number;
    alerts: number;
    priceSignals: number;
  };
  performance: {
    visibilityScore: number;
    replyRate: number;
    closeRate: number;
  };
  growth: {
    plan: string;
    status: string;
    guidance: string;
  };
};

function clampPercent(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.min(100, Math.round(Number(value))));
}

export function resolveVendorWorkspaceProjection(
  input: VendorWorkspaceProjectionInput
): VendorWorkspaceProjection {
  const profilePercent = clampPercent(input.profilePercent);
  const visibilityScore = clampPercent(input.visibilityScore);
  const replyRate = clampPercent(input.replyRate);
  const closeRate = clampPercent(input.closeRate);

  const workNow: VendorWorkspaceAction[] = [];

  if (input.newLeadCount > 0) {
    workNow.push({
      key: "new-rfqs",
      label: `Review ${input.newLeadCount} new buyer requirement${
        input.newLeadCount === 1 ? "" : "s"
      }`,
      detail: "Check suitable requirements and respond while buyer interest is active.",
      href: "/dashboard/vendor/rfqs",
      priority: 100,
      tone: "attention",
    });
  }

  if (input.unreadConversationCount > 0) {
    workNow.push({
      key: "buyer-conversations",
      label: `Continue ${input.unreadConversationCount} buyer conversation${
        input.unreadConversationCount === 1 ? "" : "s"
      }`,
      detail: "Reply clearly and move active discussions toward a decision.",
      href: "/dashboard/vendor/inbox",
      priority: 90,
      tone: "attention",
    });
  }

  if (input.readyDealCount > 0) {
    workNow.push({
      key: "ready-deals",
      label: `Review ${input.readyDealCount} ready-to-close deal signal${
        input.readyDealCount === 1 ? "" : "s"
      }`,
      detail: "Confirm price, delivery and billing details before the opportunity cools.",
      href: "/dashboard/vendor/enquiries",
      priority: 85,
      tone: "positive",
    });
  }

  if (input.missedLeadCount > 0) {
    workNow.push({
      key: "missed-leads",
      label: `Recover ${input.missedLeadCount} lead${
        input.missedLeadCount === 1 ? "" : "s"
      } needing attention`,
      detail: "Clear overdue follow-up before reviewing growth or visibility options.",
      href: "/dashboard/vendor/rfqs",
      priority: 80,
      tone: "attention",
    });
  }

  if (!input.profileComplete || profilePercent < 100) {
    workNow.push({
      key: "business-profile",
      label: "Complete your business profile",
      detail: "Improve trust and matching accuracy with complete business information.",
      href: "/onboarding/business",
      priority: 70,
      tone: "neutral",
    });
  }

  if (workNow.length === 0) {
    workNow.push({
      key: "maintain-business",
      label: "Your urgent work is clear",
      detail: "Review listings, stock and current business activity when convenient.",
      href: "/dashboard/vendor/workspace",
      priority: 10,
      tone: "positive",
    });
  }

  workNow.sort((a, b) => b.priority - a.priority);

  const readinessScore = clampPercent(
    profilePercent * 0.45 +
      Math.min(100, input.activeCapabilities.length * 20) * 0.2 +
      replyRate * 0.2 +
      visibilityScore * 0.15
  );

  const readinessLabel =
    readinessScore >= 80
      ? "Ready"
      : readinessScore >= 45
      ? "Needs attention"
      : "Getting started";

  const normalizedPlan = String(input.subscriptionPlan || "free").toLowerCase();
  const growthGuidance =
    input.recommendation?.trim() ||
    (normalizedPlan === "free"
      ? "Use the Essential Workspace fully. Review paid support only when a real business need appears."
      : "Use the tools included in your present Growth Plan before considering another plan.");

  return {
    version: "v1b",
    identity: {
      title: input.dashboardTitle,
      capabilityCount: input.activeCapabilities.length,
      profilePercent,
      profileComplete: input.profileComplete === true,
    },
    readiness: {
      score: readinessScore,
      label: readinessLabel,
    },
    workNow: workNow.slice(0, 6),
    pulse: {
      newLeads: Math.max(0, input.newLeadCount),
      unreadConversations: Math.max(0, input.unreadConversationCount),
      missedLeads: Math.max(0, input.missedLeadCount),
      readyDeals: Math.max(0, input.readyDealCount),
      alerts: Math.max(0, input.unreadAlertCount),
      priceSignals: Math.max(0, input.priceSignalCount),
    },
    performance: {
      visibilityScore,
      replyRate,
      closeRate,
    },
    growth: {
      plan: input.subscriptionPlan || "free",
      status: input.subscriptionStatus || "free",
      guidance: growthGuidance,
    },
  };
}
