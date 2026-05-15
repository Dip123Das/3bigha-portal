import { generateConstructionAlerts } from "./construction-alert-engine";
import { generateMaterialConsumptionPlan } from "./material-consumption-engine";
import { generateProgressVerificationPlan } from "./progress-verification-engine";
import { generateSiteCameraIntelligence } from "./site-camera-intelligence";
import { generateSiteIntelligence } from "./site-intelligence-engine";
import type { ConstructionRecoveryMilestone } from "./recovery-types";

export type ConstructionCommandCenter = {
  projectId: string;
  generatedAt: string;
  missionStatus: "normal" | "watch" | "active_recovery" | "critical_command";
  commandSummary: string;
  alertsCount: number;
  urgentAlertsCount: number;
  materialReadiness: string;
  verificationConfidence: number;
  siteStatus: string;
  dailyExecutionFeed: string[];
  commandActions: string[];
  modules: {
    alerts: ReturnType<typeof generateConstructionAlerts>;
    site: ReturnType<typeof generateSiteIntelligence>;
    material: ReturnType<typeof generateMaterialConsumptionPlan>;
    verification: ReturnType<typeof generateProgressVerificationPlan>;
    camera: ReturnType<typeof generateSiteCameraIntelligence>;
  };
};

export function generateConstructionCommandCenter(params: {
  projectId: string;
  milestones: ConstructionRecoveryMilestone[];
}): ConstructionCommandCenter {
  const { projectId, milestones } = params;

  const alerts = generateConstructionAlerts({ projectId, milestones });
  const site = generateSiteIntelligence({ projectId, milestones });
  const material = generateMaterialConsumptionPlan({ projectId, milestones });
  const verification = generateProgressVerificationPlan({ projectId, milestones });
  const camera = generateSiteCameraIntelligence(projectId);

  const urgentAlertsCount = alerts.filter(
    (alert) => alert.severity === "high" || alert.severity === "critical",
  ).length;

  const missionStatus =
    alerts.some((alert) => alert.severity === "critical")
      ? "critical_command"
      : urgentAlertsCount > 0
        ? "active_recovery"
        : alerts.length > 0
          ? "watch"
          : "normal";

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    missionStatus,
    commandSummary:
      missionStatus === "normal"
        ? "Construction execution is stable. Continue normal monitoring."
        : missionStatus === "watch"
          ? "Early warning signals detected. Monitor site progress and procurement readiness."
          : missionStatus === "active_recovery"
            ? "Active recovery required. Escalate site, contractor, and procurement actions."
            : "Critical command intervention required. Notify owner and activate recovery workflow.",
    alertsCount: alerts.length,
    urgentAlertsCount,
    materialReadiness: material.procurementReadiness,
    verificationConfidence: verification.overallVerificationConfidence,
    siteStatus: site.dailyExecutionStatus,
    dailyExecutionFeed: [
      `Site status: ${site.dailyExecutionStatus}`,
      `Alerts detected: ${alerts.length}`,
      `Urgent alerts: ${urgentAlertsCount}`,
      `Material readiness: ${material.procurementReadiness}`,
      `Progress verification confidence: ${verification.overallVerificationConfidence}%`,
      `Camera/photo intelligence: ${camera.readiness}`,
    ],
    commandActions: [
      urgentAlertsCount > 0 ? "Notify owner/project manager about urgent risk." : "",
      material.procurementReadiness === "urgent_escalation" ||
      material.procurementReadiness === "prepare_rfq"
        ? "Prepare backup material RFQ and vendor escalation."
        : "",
      verification.siteVisitRecommended ? "Request physical site verification." : "",
      verification.photoVerificationRecommended ? "Ask contractor for milestone photos." : "",
      site.siteSupervisionNeed === "urgent" || site.siteSupervisionNeed === "high"
        ? "Increase supervisor follow-up and daily progress reporting."
        : "",
    ].filter(Boolean),
    modules: {
      alerts,
      site,
      material,
      verification,
      camera,
    },
  };
}
