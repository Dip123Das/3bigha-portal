import {
  clampScore,
  gradeHealthScore,
  severityWeight,
  summarizeHealth,
  type ConstructionAiSignal,
} from "./construction-ai-signals";
import {
  getDelayDays,
  getMilestoneTitle,
  isMilestoneBlocked,
  rankSeverity,
} from "./recovery-rules";
import type { ConstructionRecoveryMilestone } from "./recovery-types";

export type ConstructionProjectHealth = {
  projectId: string;
  generatedAt: string;
  healthScore: number;
  grade: ReturnType<typeof gradeHealthScore>;
  summary: string;
  delayedCount: number;
  blockedCount: number;
  averageProgress: number;
  executionConfidence: number;
  signals: ConstructionAiSignal[];
  recommendedFocus: string[];
};

function averageProgress(milestones: ConstructionRecoveryMilestone[]): number {
  if (!milestones.length) return 0;
  const total = milestones.reduce((sum, milestone) => {
    return sum + Number(milestone.progress_percent || 0);
  }, 0);
  return Math.round(total / milestones.length);
}

export function generateConstructionProjectHealth(params: {
  projectId: string;
  milestones: ConstructionRecoveryMilestone[];
}): ConstructionProjectHealth {
  const { projectId, milestones } = params;

  const signals: ConstructionAiSignal[] = [];
  const delayed = milestones.filter((milestone) => getDelayDays(milestone) > 0);
  const blocked = milestones.filter(isMilestoneBlocked);
  const progress = averageProgress(milestones);

  delayed.forEach((milestone) => {
    const delayDays = getDelayDays(milestone);
    signals.push({
      code: "DELAY_RISK",
      label: `${getMilestoneTitle(milestone)} delayed`,
      severity: delayDays >= 10 ? "critical" : delayDays >= 5 ? "high" : "medium",
      message: `${getMilestoneTitle(milestone)} is delayed by ${delayDays} day(s).`,
      scoreImpact: delayDays >= 10 ? 30 : delayDays >= 5 ? 20 : 10,
    });
  });

  blocked.forEach((milestone) => {
    signals.push({
      code: "BLOCKED_WORK",
      label: `${getMilestoneTitle(milestone)} blocked`,
      severity: "high",
      message:
        milestone.blocker_reason ||
        `${getMilestoneTitle(milestone)} is blocked and needs escalation.`,
      scoreImpact: 20,
    });
  });

  if (progress < 35 && milestones.length > 0) {
    signals.push({
      code: "LOW_EXECUTION_PROGRESS",
      label: "Low execution progress",
      severity: "medium",
      message: `Average milestone progress is only ${progress}%.`,
      scoreImpact: 10,
    });
  }

  const penalty = signals.reduce((sum, signal) => {
    return sum + Math.max(signal.scoreImpact, severityWeight(signal.severity));
  }, 0);

  const healthScore = clampScore(100 - penalty);
  const grade = gradeHealthScore(healthScore);

  const recommendedFocus = [
    delayed.length ? "Recover delayed milestones" : "",
    blocked.length ? "Escalate blocked procurement/site dependencies" : "",
    progress < 50 ? "Increase daily site progress monitoring" : "",
    grade === "risk" || grade === "critical" ? "Prepare alternate vendor and contractor backup" : "",
  ].filter(Boolean);

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    healthScore,
    grade,
    summary: summarizeHealth(healthScore),
    delayedCount: delayed.length,
    blockedCount: blocked.length,
    averageProgress: progress,
    executionConfidence: clampScore(healthScore - blocked.length * 5),
    signals,
    recommendedFocus: recommendedFocus.length
      ? recommendedFocus
      : ["Continue normal milestone monitoring"],
  };
}
