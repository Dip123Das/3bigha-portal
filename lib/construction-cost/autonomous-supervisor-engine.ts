import type { SignalSeverity } from "./construction-ai-signals";
import { generateConstructionAlerts, type ConstructionAlert } from "./construction-alert-engine";
import { generateSiteIntelligence, type SiteIntelligence } from "./site-intelligence-engine";
import type { ConstructionRecoveryMilestone } from "./recovery-types";

export type SupervisorCommandType =
  | "notify_owner"
  | "request_site_update"
  | "escalate_procurement"
  | "prepare_backup_vendor"
  | "ask_contractor_recovery"
  | "continue_monitoring";

export type SupervisorCommand = {
  type: SupervisorCommandType;
  title: string;
  instruction: string;
  priority: SignalSeverity;
  automationReady: boolean;
};

export type AutonomousConstructionSupervisorPlan = {
  projectId: string;
  generatedAt: string;
  mode: "monitoring" | "assisted_supervision" | "recovery_required" | "urgent_intervention";
  alerts: ConstructionAlert[];
  siteIntelligence: SiteIntelligence;
  commands: SupervisorCommand[];
  ownerMessageDraft: string;
  contractorMessageDraft: string;
  futureAutonomousExecutionReady: boolean;
};

function maxSeverity(alerts: ConstructionAlert[]): SignalSeverity {
  const order: SignalSeverity[] = ["low", "medium", "high", "critical"];
  return alerts
    .map((alert) => alert.severity)
    .sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] || "low";
}

export function generateAutonomousConstructionSupervisorPlan(params: {
  projectId: string;
  milestones: ConstructionRecoveryMilestone[];
}): AutonomousConstructionSupervisorPlan {
  const { projectId, milestones } = params;

  const alerts = generateConstructionAlerts({ projectId, milestones });
  const siteIntelligence = generateSiteIntelligence({ projectId, milestones });
  const severity = maxSeverity(alerts);

  const mode =
    severity === "critical"
      ? "urgent_intervention"
      : severity === "high"
        ? "recovery_required"
        : severity === "medium"
          ? "assisted_supervision"
          : "monitoring";

  const commands: SupervisorCommand[] = [];

  if (alerts.some((alert) => alert.ownerNotificationRequired)) {
    commands.push({
      type: "notify_owner",
      title: "Notify project owner",
      instruction:
        "Send project owner a clear warning about delay/blockage and recovery action required.",
      priority: severity,
      automationReady: true,
    });
  }

  if (alerts.some((alert) => alert.type === "material" || alert.type === "blocked")) {
    commands.push({
      type: "escalate_procurement",
      title: "Escalate procurement dependency",
      instruction:
        "Check material/vendor dependency and prepare procurement recovery or RFQ action.",
      priority: "high",
      automationReady: true,
    });

    commands.push({
      type: "prepare_backup_vendor",
      title: "Prepare alternate vendor backup",
      instruction:
        "Create alternate vendor shortlist for material/labour/equipment continuity.",
      priority: "high",
      automationReady: true,
    });
  }

  if (alerts.some((alert) => alert.type === "delay" || alert.type === "labour")) {
    commands.push({
      type: "ask_contractor_recovery",
      title: "Ask contractor for recovery commitment",
      instruction:
        "Ask contractor/supervisor to provide revised timeline, manpower plan, and daily progress commitment.",
      priority: severity === "low" ? "medium" : severity,
      automationReady: false,
    });
  }

  commands.push({
    type: "request_site_update",
    title: "Request site update",
    instruction: siteIntelligence.supervisorInstruction,
    priority: severity,
    automationReady: false,
  });

  if (!alerts.length) {
    commands.push({
      type: "continue_monitoring",
      title: "Continue monitoring",
      instruction:
        "No urgent issue detected. Continue milestone tracking and daily project review.",
      priority: "low",
      automationReady: false,
    });
  }

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    mode,
    alerts,
    siteIntelligence,
    commands,
    ownerMessageDraft:
      mode === "monitoring"
        ? "Your construction project is currently stable. We will continue regular milestone monitoring."
        : `Your construction project needs attention. Current AI supervisor mode: ${mode}. ${siteIntelligence.ownerUpdate}`,
    contractorMessageDraft:
      mode === "monitoring"
        ? "Please continue planned execution and share regular milestone updates."
        : `Please submit today's site progress, reason for delay/blockage, manpower status, material availability, and recovery commitment. ${siteIntelligence.supervisorInstruction}`,
    futureAutonomousExecutionReady:
      commands.some((command) => command.automationReady) || alerts.some((alert) => alert.automationReady),
  };
}
