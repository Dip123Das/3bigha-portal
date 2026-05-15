import type { SignalSeverity } from "./construction-ai-signals";
import type { ConstructionRecoveryMilestone } from "./recovery-types";

export type MaterialConsumptionSignal = {
  material: string;
  risk: SignalSeverity;
  message: string;
  recommendedAction: string;
};

export type MaterialConsumptionPlan = {
  projectId: string;
  generatedAt: string;
  consumptionRisk: SignalSeverity;
  signals: MaterialConsumptionSignal[];
  procurementReadiness: "normal" | "watch" | "prepare_rfq" | "urgent_escalation";
};

function detectMaterial(text: string, material: string): boolean {
  return text.toLowerCase().includes(material.toLowerCase());
}

export function generateMaterialConsumptionPlan(params: {
  projectId: string;
  milestones: ConstructionRecoveryMilestone[];
}): MaterialConsumptionPlan {
  const { projectId, milestones } = params;

  const allText = milestones
    .map((m) => `${m.title || ""} ${m.name || ""} ${m.phase || ""} ${m.notes || ""} ${m.blocker_reason || ""}`)
    .join(" ")
    .toLowerCase();

  const signals: MaterialConsumptionSignal[] = [];

  [
    "cement",
    "tmt",
    "steel",
    "sand",
    "brick",
    "aggregate",
    "stone chips",
    "paint",
    "electrical",
    "plumbing",
  ].forEach((material) => {
    if (detectMaterial(allText, material)) {
      signals.push({
        material,
        risk: /block|delay|shortage|pending|not available/.test(allText) ? "high" : "medium",
        message: `${material} dependency detected in current construction execution data.`,
        recommendedAction: `Verify ${material} stock, vendor delivery, and backup procurement readiness.`,
      });
    }
  });

  const hasHighRisk = signals.some((signal) => signal.risk === "high");

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    consumptionRisk: hasHighRisk ? "high" : signals.length ? "medium" : "low",
    signals,
    procurementReadiness: hasHighRisk
      ? "urgent_escalation"
      : signals.length >= 3
        ? "prepare_rfq"
        : signals.length
          ? "watch"
          : "normal",
  };
}
