import type { SignalSeverity } from "./construction-ai-signals";
import { getDelayDays, getMilestoneTitle, isMilestoneBlocked } from "./recovery-rules";
import type { ConstructionRecoveryMilestone } from "./recovery-types";

export type ConstructionAlertType =
  | "delay"
  | "blocked"
  | "material"
  | "labour"
  | "budget"
  | "supervision"
  | "owner_warning";

export type ConstructionAlert = {
  id: string;
  type: ConstructionAlertType;
  severity: SignalSeverity;
  title: string;
  message: string;
  recommendedAction: string;
  ownerNotificationRequired: boolean;
  automationReady: boolean;
};

function makeAlertId(type: ConstructionAlertType, index: number): string {
  return `${type}-${index + 1}`;
}

function severityFromDelay(delayDays: number): SignalSeverity {
  if (delayDays >= 10) return "critical";
  if (delayDays >= 5) return "high";
  if (delayDays >= 2) return "medium";
  return "low";
}

export function generateConstructionAlerts(params: {
  projectId: string;
  milestones: ConstructionRecoveryMilestone[];
}): ConstructionAlert[] {
  const { milestones } = params;
  const alerts: ConstructionAlert[] = [];

  milestones.forEach((milestone, index) => {
    const title = getMilestoneTitle(milestone);
    const delayDays = getDelayDays(milestone);

    if (delayDays > 0) {
      const severity = severityFromDelay(delayDays);

      alerts.push({
        id: makeAlertId("delay", alerts.length),
        type: "delay",
        severity,
        title: `${title} delayed`,
        message: `${title} is delayed by ${delayDays} day(s).`,
        recommendedAction:
          severity === "critical"
            ? "Immediately warn project owner and activate recovery supervision."
            : "Ask contractor/supervisor for recovery schedule.",
        ownerNotificationRequired: severity === "high" || severity === "critical",
        automationReady: true,
      });
    }

    if (isMilestoneBlocked(milestone)) {
      alerts.push({
        id: makeAlertId("blocked", alerts.length),
        type: "blocked",
        severity: "high",
        title: `${title} blocked`,
        message:
          milestone.blocker_reason ||
          `${title} is blocked and needs immediate escalation.`,
        recommendedAction:
          "Escalate blocker, check material/labour/vendor dependency, and prepare backup action.",
        ownerNotificationRequired: true,
        automationReady: true,
      });
    }

    const noteText = String(milestone.blocker_reason || milestone.notes || "").toLowerCase();

    if (/cement|steel|tmt|sand|brick|material|supplier|vendor/.test(noteText)) {
      alerts.push({
        id: makeAlertId("material", alerts.length),
        type: "material",
        severity: "high",
        title: `${title} material risk`,
        message: "Material/vendor dependency detected from milestone notes.",
        recommendedAction:
          "Prepare backup RFQ and alternate vendor shortlist for critical material supply.",
        ownerNotificationRequired: true,
        automationReady: true,
      });
    }

    if (/labour|mason|worker|contractor|supervisor|manpower/.test(noteText)) {
      alerts.push({
        id: makeAlertId("labour", alerts.length),
        type: "labour",
        severity: "medium",
        title: `${title} labour risk`,
        message: "Labour/contractor dependency detected from milestone notes.",
        recommendedAction:
          "Ask contractor to confirm manpower strength and daily execution commitment.",
        ownerNotificationRequired: false,
        automationReady: false,
      });
    }

    const progress = Number(milestone.progress_percent || 0);
    if (progress > 0 && progress < 35 && delayDays >= 2) {
      alerts.push({
        id: makeAlertId("supervision", alerts.length),
        type: "supervision",
        severity: "high",
        title: `${title} needs supervision`,
        message: `${title} has low progress and visible delay risk.`,
        recommendedAction:
          "Increase site supervision and request daily progress update with photos.",
        ownerNotificationRequired: true,
        automationReady: false,
      });
    }

    void index;
  });

  if (alerts.some((alert) => alert.severity === "critical")) {
    alerts.push({
      id: makeAlertId("owner_warning", alerts.length),
      type: "owner_warning",
      severity: "critical",
      title: "Urgent owner warning required",
      message:
        "Critical construction execution risk detected. Owner should be informed immediately.",
      recommendedAction:
        "Send owner warning and activate construction recovery workflow.",
      ownerNotificationRequired: true,
      automationReady: true,
    });
  }

  return alerts;
}
