import { clampScore } from "./construction-ai-signals";
import { getDelayDays, getMilestoneTitle, isMilestoneBlocked } from "./recovery-rules";
import type { ConstructionRecoveryMilestone } from "./recovery-types";

export type ProgressVerificationItem = {
  milestone: string;
  claimedProgress: number;
  verificationConfidence: number;
  status: "verified" | "needs_photo" | "needs_site_check" | "blocked";
  message: string;
};

export type ProgressVerificationPlan = {
  projectId: string;
  generatedAt: string;
  overallVerificationConfidence: number;
  items: ProgressVerificationItem[];
  photoVerificationRecommended: boolean;
  siteVisitRecommended: boolean;
};

export function generateProgressVerificationPlan(params: {
  projectId: string;
  milestones: ConstructionRecoveryMilestone[];
}): ProgressVerificationPlan {
  const { projectId, milestones } = params;

  const items = milestones.map((milestone) => {
    const progress = Number(milestone.progress_percent || 0);
    const delayDays = getDelayDays(milestone);
    const blocked = isMilestoneBlocked(milestone);

    const verificationConfidence = blocked
      ? 35
      : delayDays > 0 && progress < 50
        ? 45
        : progress >= 80
          ? 80
          : progress >= 40
            ? 65
            : 55;

    return {
      milestone: getMilestoneTitle(milestone),
      claimedProgress: progress,
      verificationConfidence: clampScore(verificationConfidence),
      status: blocked
        ? "blocked"
        : verificationConfidence < 50
          ? "needs_site_check"
          : verificationConfidence < 70
            ? "needs_photo"
            : "verified",
      message: blocked
        ? "Milestone is blocked. Physical verification and escalation are recommended."
        : verificationConfidence < 70
          ? "Progress needs photo/site verification before relying on it."
          : "Progress appears reasonably consistent with milestone status.",
    } satisfies ProgressVerificationItem;
  });

  const average = items.length
    ? clampScore(items.reduce((sum, item) => sum + item.verificationConfidence, 0) / items.length)
    : 100;

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    overallVerificationConfidence: average,
    items,
    photoVerificationRecommended: items.some((item) => item.status === "needs_photo"),
    siteVisitRecommended: items.some(
      (item) => item.status === "needs_site_check" || item.status === "blocked",
    ),
  };
}
