import type { ConstructionAiSignal, SignalSeverity } from "./construction-ai-signals";
import { clampScore } from "./construction-ai-signals";
import {
  getDelayDays,
  getMilestoneTitle,
  isMilestoneBlocked,
} from "./recovery-rules";
import type { ConstructionRecoveryMilestone } from "./recovery-types";

export type ConstructionRiskForecast = {
  projectId: string;
  generatedAt: string;
  delayProbability: number;
  budgetOverrunProbability: number;
  materialShortageProbability: number;
  labourRiskProbability: number;
  contractorPerformanceRisk: number;
  overallForecastRisk: SignalSeverity;
  signals: ConstructionAiSignal[];
  nextBestActions: string[];
};

function riskBand(value: number): SignalSeverity {
  if (value >= 80) return "critical";
  if (value >= 60) return "high";
  if (value >= 35) return "medium";
  return "low";
}

export function generateConstructionRiskForecast(params: {
  projectId: string;
  milestones: ConstructionRecoveryMilestone[];
}): ConstructionRiskForecast {
  const { projectId, milestones } = params;

  const delayed = milestones.filter((milestone) => getDelayDays(milestone) > 0);
  const blocked = milestones.filter(isMilestoneBlocked);
  const totalDelayDays = delayed.reduce((sum, milestone) => sum + getDelayDays(milestone), 0);

  const delayProbability = clampScore(delayed.length * 18 + totalDelayDays * 3 + blocked.length * 12);
  const materialShortageProbability = clampScore(
    blocked.length * 25 +
      milestones.filter((milestone) =>
        String(milestone.blocker_reason || milestone.notes || "")
          .toLowerCase()
          .match(/material|cement|steel|tmt|sand|brick|supplier|vendor/),
      ).length *
        20,
  );
  const labourRiskProbability = clampScore(
    delayed.length * 12 +
      milestones.filter((milestone) =>
        String(milestone.blocker_reason || milestone.notes || "")
          .toLowerCase()
          .match(/labour|mason|contractor|worker|supervisor/),
      ).length *
        20,
  );
  const budgetOverrunProbability = clampScore(delayProbability * 0.45 + materialShortageProbability * 0.35);
  const contractorPerformanceRisk = clampScore(delayed.length * 15 + blocked.length * 15);

  const maxRisk = Math.max(
    delayProbability,
    budgetOverrunProbability,
    materialShortageProbability,
    labourRiskProbability,
    contractorPerformanceRisk,
  );

  const signals: ConstructionAiSignal[] = [];

  delayed.slice(0, 5).forEach((milestone) => {
    signals.push({
      code: "FORECAST_DELAY",
      label: `${getMilestoneTitle(milestone)} may affect timeline`,
      severity: riskBand(getDelayDays(milestone) * 12),
      message: `${getMilestoneTitle(milestone)} has delay indicators and may push the project timeline.`,
      scoreImpact: getDelayDays(milestone) * 5,
    });
  });

  if (materialShortageProbability >= 35) {
    signals.push({
      code: "MATERIAL_SHORTAGE_FORECAST",
      label: "Material shortage risk",
      severity: riskBand(materialShortageProbability),
      message: "Material/vendor dependency may affect execution continuity.",
      scoreImpact: materialShortageProbability,
    });
  }

  if (labourRiskProbability >= 35) {
    signals.push({
      code: "LABOUR_RISK_FORECAST",
      label: "Labour execution risk",
      severity: riskBand(labourRiskProbability),
      message: "Labour, contractor, or site supervision may need escalation.",
      scoreImpact: labourRiskProbability,
    });
  }

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    delayProbability,
    budgetOverrunProbability,
    materialShortageProbability,
    labourRiskProbability,
    contractorPerformanceRisk,
    overallForecastRisk: riskBand(maxRisk),
    signals,
    nextBestActions: [
      delayProbability >= 35 ? "Review delayed milestones and compress execution schedule." : "",
      materialShortageProbability >= 35 ? "Prepare backup RFQ for critical material supply." : "",
      labourRiskProbability >= 35 ? "Ask contractor/supervisor for daily manpower commitment." : "",
      budgetOverrunProbability >= 35 ? "Warn project owner about possible cost overrun." : "",
      contractorPerformanceRisk >= 35 ? "Track contractor performance and prepare alternate execution support." : "",
    ].filter(Boolean),
  };
}
