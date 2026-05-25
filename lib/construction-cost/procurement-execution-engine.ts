import type { ProcurementTimelineStage } from "./procurement-timeline-engine";

export type ProcurementExecutionInsight = {
  stageKey: string;
  sequenceLabel: string;
  rfqTitle: string;
  vendorCategory: string;
  arrivalPlan: string;
  riskWarning: string;
  commandAction: string;
  criticalPath: boolean;
  delayImpact: string;
  siteStoppageRisk: "high" | "medium" | "low";
};

const VENDOR_CATEGORY_BY_STAGE: Record<string, string> = {
  structure: "Cement / TMT / Sand / Aggregate Supplier",
  masonry: "Brick / Block / Masonry Material Supplier",
  plumbing: "Plumbing / Sanitary Vendor",
  electrical: "Electrical Contractor / Material Supplier",
  finishing: "Tiles / Paint / Finishing Vendor",
};

const RFQ_TITLE_BY_STAGE: Record<string, string> = {
  structure: "Create RFQ for cement, TMT steel, sand and stone chips",
  masonry: "Create RFQ for bricks, blocks and masonry materials",
  plumbing: "Create RFQ for pipes, fittings, sanitary lines and water tank",
  electrical: "Create RFQ for wires, conduits, DB box and electrical points",
  finishing: "Create RFQ for tiles, paint, putty, primer and finishing items",
};

export function generateProcurementExecutionInsights(
  stages: ProcurementTimelineStage[],
): ProcurementExecutionInsight[] {
  return stages.map((stage, index) => {
    const isFirst = index === 0;
    const isHighUrgency = stage.urgency === "high";
    const criticalPath = stage.progressWeight >= 25 || stage.blocks.length >= 3;

    return {
      stageKey: stage.key,
      sequenceLabel: isFirst
        ? "Start immediately"
        : `After ${stages[index - 1]?.title || "previous stage"}`,
      rfqTitle:
        RFQ_TITLE_BY_STAGE[stage.key] ||
        `Create RFQ for ${stage.title.toLowerCase()}`,
      vendorCategory:
        VENDOR_CATEGORY_BY_STAGE[stage.key] || "Construction Vendor",
      arrivalPlan: isHighUrgency
        ? "Material should reach site before work starts. Confirm stock, unloading and transport early."
        : "Material can be planned after previous civil progress is confirmed.",
      riskWarning: isHighUrgency
        ? "Delay here can stop site work and increase labour idle cost."
        : "Delay may affect finishing speed, but can be controlled with early vendor confirmation.",
      commandAction: stage.rfqReady
        ? "Ready for RFQ and vendor matching"
        : "Needs more details before RFQ",
      criticalPath,
      delayImpact: criticalPath
        ? "Delay here can push the whole construction schedule."
        : "Delay here may affect the next local activity only.",
      siteStoppageRisk: isHighUrgency
        ? "high"
        : stage.blocks.length > 0
        ? "medium"
        : "low",
    };
  });
}

export type ProcurementHealthSummary = {
  healthScore: number;
  healthStatus: "Healthy" | "Watch Closely" | "High Risk";
  delayRiskPercent: number;
  estimatedTimelineSlipDays: number;
  recoverySuggestion: string;
};

export function calculateProcurementHealthSummary(
  insights: ProcurementExecutionInsight[],
): ProcurementHealthSummary {
  const criticalCount = insights.filter((item) => item.criticalPath).length;
  const highRiskCount = insights.filter(
    (item) => item.siteStoppageRisk === "high",
  ).length;
  const mediumRiskCount = insights.filter(
    (item) => item.siteStoppageRisk === "medium",
  ).length;

  const penalty = criticalCount * 8 + highRiskCount * 12 + mediumRiskCount * 5;
  const healthScore = Math.max(45, Math.min(95, 95 - penalty));

  const delayRiskPercent = Math.min(
    90,
    criticalCount * 18 + highRiskCount * 25 + mediumRiskCount * 10,
  );

  const estimatedTimelineSlipDays = Math.max(
    0,
    criticalCount * 4 + highRiskCount * 5 + mediumRiskCount * 2,
  );

  return {
    healthScore,
    healthStatus:
      healthScore >= 80
        ? "Healthy"
        : healthScore >= 65
        ? "Watch Closely"
        : "High Risk",
    delayRiskPercent,
    estimatedTimelineSlipDays,
    recoverySuggestion:
      healthScore >= 80
        ? "Procurement sequence is stable. Keep vendor confirmation and delivery dates updated."
        : healthScore >= 65
        ? "Confirm structural and masonry vendors early to avoid labour idle time."
        : "Immediately lock critical materials, vendor delivery dates and backup suppliers.",
  };
}

export type ProcurementAutonomousAction = {
  key: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  owner: string;
  action: string;
};

export function generateProcurementAutonomousActions(
  insights: ProcurementExecutionInsight[],
): ProcurementAutonomousAction[] {
  return insights.flatMap((item) => {
    const actions: ProcurementAutonomousAction[] = [];

    if (item.criticalPath) {
      actions.push({
        key: `${item.stageKey}_vendor_confirm`,
        title: `Confirm vendor for ${item.vendorCategory}`,
        priority: "high",
        owner: "Procurement team",
        action: "Call vendor, confirm stock, rate validity, delivery date and unloading support.",
      });
    }

    if (item.siteStoppageRisk === "high") {
      actions.push({
        key: `${item.stageKey}_backup_vendor`,
        title: `Prepare backup supplier for ${item.vendorCategory}`,
        priority: "critical",
        owner: "Site manager",
        action: "Keep second vendor ready before work starts to avoid labour idle time.",
      });
    }

    return actions;
  });
}