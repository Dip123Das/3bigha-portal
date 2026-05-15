import type {
  ConstructionRecoveryMilestone,
  RecoveryRiskSignal,
  RecoverySeverity,
} from "./recovery-types";

export function getMilestoneTitle(milestone: ConstructionRecoveryMilestone): string {
  return milestone.title || milestone.name || milestone.phase || "Construction milestone";
}

export function getMilestoneDueDate(milestone: ConstructionRecoveryMilestone): string | null {
  return milestone.due_date || milestone.planned_end || null;
}

export function isMilestoneBlocked(milestone: ConstructionRecoveryMilestone): boolean {
  const status = String(milestone.status || "").toLowerCase();
  return status.includes("block") || Boolean(milestone.blocker_reason);
}

export function getDelayDays(milestone: ConstructionRecoveryMilestone, today = new Date()): number {
  const dueDateValue = getMilestoneDueDate(milestone);
  if (!dueDateValue) return 0;

  const dueDate = new Date(dueDateValue);
  if (Number.isNaN(dueDate.getTime())) return 0;

  const status = String(milestone.status || "").toLowerCase();
  if (status.includes("complete") || status.includes("done")) return 0;

  const diff = today.getTime() - dueDate.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getDelaySeverity(delayDays: number): RecoverySeverity {
  if (delayDays >= 10) return "critical";
  if (delayDays >= 5) return "high";
  if (delayDays >= 2) return "medium";
  if (delayDays >= 1) return "low";
  return "low";
}

export function rankSeverity(values: RecoverySeverity[]): RecoverySeverity {
  const order: RecoverySeverity[] = ["low", "medium", "high", "critical"];
  return values.sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] || "low";
}

export function buildRiskSignals(
  milestones: ConstructionRecoveryMilestone[],
): RecoveryRiskSignal[] {
  const today = new Date();
  const signals: RecoveryRiskSignal[] = [];

  milestones.forEach((milestone) => {
    const title = getMilestoneTitle(milestone);
    const delayDays = getDelayDays(milestone, today);

    if (delayDays > 0) {
      signals.push({
        code: "MILESTONE_DELAY",
        label: `${title} delayed`,
        severity: getDelaySeverity(delayDays),
        message: `${title} is delayed by ${delayDays} day${delayDays > 1 ? "s" : ""}.`,
      });
    }

    if (isMilestoneBlocked(milestone)) {
      signals.push({
        code: "MILESTONE_BLOCKED",
        label: `${title} blocked`,
        severity: "high",
        message:
          milestone.blocker_reason ||
          `${title} is blocked and needs immediate recovery action.`,
      });
    }

    const progress = Number(milestone.progress_percent || 0);
    if (progress > 0 && progress < 40 && delayDays >= 2) {
      signals.push({
        code: "LOW_PROGRESS_DELAY",
        label: `${title} low progress`,
        severity: "high",
        message: `${title} has only ${progress}% progress and is already delayed.`,
      });
    }
  });

  return signals;
}
