import { getDelayDays, isMilestoneBlocked } from "./recovery-rules";
import type { ConstructionRecoveryMilestone } from "./recovery-types";

export type SiteIntelligence = {
  projectId: string;
  generatedAt: string;
  dailyExecutionStatus: "normal" | "watch" | "slow" | "blocked" | "critical";
  siteSupervisionNeed: "low" | "medium" | "high" | "urgent";
  materialCoordinationNeed: "low" | "medium" | "high";
  labourCoordinationNeed: "low" | "medium" | "high";
  ownerUpdate: string;
  supervisorInstruction: string;
  dailyChecklist: string[];
};

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export function generateSiteIntelligence(params: {
  projectId: string;
  milestones: ConstructionRecoveryMilestone[];
}): SiteIntelligence {
  const { projectId, milestones } = params;

  const delayed = milestones.filter((milestone) => getDelayDays(milestone) > 0);
  const blocked = milestones.filter(isMilestoneBlocked);
  const criticalDelay = delayed.some((milestone) => getDelayDays(milestone) >= 10);
  const allNotes = milestones
    .map((milestone) => `${milestone.blocker_reason || ""} ${milestone.notes || ""}`)
    .join(" ")
    .toLowerCase();

  const materialRisk = includesAny(allNotes, [
    "cement",
    "steel",
    "tmt",
    "sand",
    "brick",
    "material",
    "supplier",
    "vendor",
  ]);

  const labourRisk = includesAny(allNotes, [
    "labour",
    "mason",
    "worker",
    "contractor",
    "supervisor",
    "manpower",
  ]);

  const dailyExecutionStatus =
    criticalDelay || blocked.length >= 2
      ? "critical"
      : blocked.length
        ? "blocked"
        : delayed.length >= 2
          ? "slow"
          : delayed.length
            ? "watch"
            : "normal";

  const siteSupervisionNeed =
    dailyExecutionStatus === "critical"
      ? "urgent"
      : dailyExecutionStatus === "blocked" || dailyExecutionStatus === "slow"
        ? "high"
        : dailyExecutionStatus === "watch"
          ? "medium"
          : "low";

  const materialCoordinationNeed = materialRisk || blocked.length > 0 ? "high" : delayed.length ? "medium" : "low";
  const labourCoordinationNeed = labourRisk || delayed.length >= 2 ? "high" : delayed.length ? "medium" : "low";

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    dailyExecutionStatus,
    siteSupervisionNeed,
    materialCoordinationNeed,
    labourCoordinationNeed,
    ownerUpdate:
      dailyExecutionStatus === "normal"
        ? "Construction execution is running normally. Continue regular monitoring."
        : "Construction execution needs attention. Delay/blockage signals require supervision and recovery follow-up.",
    supervisorInstruction:
      siteSupervisionNeed === "urgent"
        ? "Visit site urgently, identify blockers, collect photos, and submit recovery status today."
        : siteSupervisionNeed === "high"
          ? "Increase site follow-up and collect daily progress confirmation."
          : "Continue milestone monitoring and verify progress updates.",
    dailyChecklist: [
      "Verify physical progress against planned milestone.",
      "Collect contractor/supervisor update.",
      materialCoordinationNeed !== "low" ? "Check material availability and vendor delivery status." : "",
      labourCoordinationNeed !== "low" ? "Check labour/manpower availability for next working day." : "",
      siteSupervisionNeed === "urgent" || siteSupervisionNeed === "high"
        ? "Request site photos and recovery commitment."
        : "",
      dailyExecutionStatus !== "normal" ? "Prepare owner update if delay continues." : "",
    ].filter(Boolean),
  };
}
