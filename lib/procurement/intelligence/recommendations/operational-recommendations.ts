import type { ProcurementDecayResult } from "@/lib/procurement/intelligence/decay-signals";
import type { ProcurementMomentumResult } from "@/lib/procurement/intelligence/momentum-signals";
import type { ProcurementOperationalBalanceResult } from "@/lib/procurement/intelligence/operational-balance";
import type { ProcurementMemoryProfileResult } from "@/lib/procurement/intelligence/memory/procurement-memory-profile";

export type ProcurementOperationalRecommendation = {
  priority: "normal" | "important" | "urgent" | "critical";
  label: string;
  message: string;
  actionLabel?: string;
};

export function buildOperationalRecommendations(input: {
  decay?: ProcurementDecayResult;
  momentum?: ProcurementMomentumResult;
  balance?: ProcurementOperationalBalanceResult;
  memory?: ProcurementMemoryProfileResult;
}): ProcurementOperationalRecommendation[] {
  const recommendations: ProcurementOperationalRecommendation[] = [];

  if (input.balance?.level === "critical") {
    recommendations.push({
      priority: "critical",
      label: "Immediate Attention Needed",
      message: "Workflow continuity is critically weak.",
      actionLabel: "Review workflow now",
    });
  }

  if (input.balance?.level === "deteriorating") {
    recommendations.push({
      priority: "urgent",
      label: "Workflow Weakening",
      message: "Procurement activity is losing continuity.",
      actionLabel: "Send follow-up",
    });
  }

  if (input.balance?.level === "recovering") {
    recommendations.push({
      priority: "important",
      label: "Workflow Recovering",
      message: "Recent activity suggests the workflow is recovering.",
      actionLabel: "Continue monitoring",
    });
  }

  if (input.decay?.level === "stale") {
    recommendations.push({
      priority: "urgent",
      label: "Workflow Becoming Stale",
      message: "Recent activity is low. A follow-up may help.",
      actionLabel: "Follow up",
    });
  }

  if (input.decay?.level === "slowing") {
    recommendations.push({
      priority: "important",
      label: "Workflow Slowing",
      message: "Activity is reducing. Keep the procurement moving.",
      actionLabel: "Check status",
    });
  }

  if (input.momentum?.level === "accelerating") {
    recommendations.push({
      priority: "normal",
      label: "Momentum Improving",
      message: "Workflow activity is moving strongly.",
      actionLabel: "Proceed normally",
    });
  }

  if (input.memory?.reliability === "high_risk") {
    recommendations.push({
      priority: "urgent",
      label: "Past Risk Detected",
      message: "Previous procurement behavior suggests caution.",
      actionLabel: "Review history",
    });
  }

  if (input.memory?.reliability === "reliable") {
    recommendations.push({
      priority: "normal",
      label: "Reliable Pattern",
      message: "Past procurement behavior appears reliable.",
      actionLabel: "Proceed confidently",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "normal",
      label: "Workflow Stable",
      message: "No immediate operational action is needed.",
      actionLabel: "Continue",
    });
  }

  return recommendations;
}
