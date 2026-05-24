import type { ProcurementTimelineStage } from "./procurement-timeline-engine";

export type ProcurementExecutionInsight = {
  stageKey: string;
  sequenceLabel: string;
  rfqTitle: string;
  vendorCategory: string;
  arrivalPlan: string;
  riskWarning: string;
  commandAction: string;
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
    };
  });
}