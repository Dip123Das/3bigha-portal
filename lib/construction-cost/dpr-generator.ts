import type { ConstructionEstimateResponse } from "./cost-types";

export type DprSection = {
  title: string;
  content: string[];
};

export type DprReport = {
  title: string;

  generatedAt: string;

  executiveSummary: string[];

  sections: DprSection[];

  financialSummary: {
    estimatedProjectCost: number;
    estimatedCivilCost: number;
    estimatedElectricalCost: number;
    estimatedPlumbingCost: number;
    estimatedFinishingCost: number;
    recommendedContingency: number;
  };

  recommendations: string[];
};

function formatCurrency(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function generateDprReport(
  estimate: ConstructionEstimateResponse,
): DprReport {
  const contingency =
    Math.round(
      estimate.summary.estimatedBudget *
      (
        estimate.summary.recommendedContingencyPercent / 100
      ),
    );

  const sections: DprSection[] = [];

  if (estimate.roomPlanning) {
    sections.push({
      title: "Architectural Planning",
      content: [
        `Estimated bedrooms: ${estimate.roomPlanning.estimatedBedrooms}`,
        `Estimated bathrooms: ${estimate.roomPlanning.estimatedBathrooms}`,
        `Estimated living rooms: ${estimate.roomPlanning.estimatedLivingRooms}`,
        `Estimated kitchens: ${estimate.roomPlanning.estimatedKitchens}`,
        `Estimated parking slots: ${estimate.roomPlanning.estimatedParkingSlots}`,
        `Efficiency ratio: ${estimate.roomPlanning.efficiencyPercent}%`,
      ],
    });
  }

  if (estimate.structuralQuantities) {
    sections.push({
      title: "Structural Engineering Quantities",
      content: [
        `RCC slab concrete: ${estimate.structuralQuantities.slabConcreteCum} cum`,
        `Beam concrete: ${estimate.structuralQuantities.beamConcreteCum} cum`,
        `Column concrete: ${estimate.structuralQuantities.columnConcreteCum} cum`,
        `Brickwork: ${estimate.structuralQuantities.brickworkCum} cum`,
        `Flooring area: ${estimate.structuralQuantities.flooringAreaSqFt} sq.ft`,
        `Painting area: ${estimate.structuralQuantities.paintAreaSqFt} sq.ft`,
      ],
    });
  }

  if (estimate.pwdItemization) {
    sections.push({
      title: "PWD Itemization Summary",
      content: [
        `Civil items: ${estimate.pwdItemization.civilItems.length}`,
        `Electrical items: ${estimate.pwdItemization.electricalItems.length}`,
        `Plumbing items: ${estimate.pwdItemization.plumbingItems.length}`,
        `Finishing items: ${estimate.pwdItemization.finishingItems.length}`,
        `PWD estimated total: ${formatCurrency(
          estimate.pwdItemization.totalEstimatedCost,
        )}`,
      ],
    });
  }

  return {
    title:
      "Detailed Project Report (DPR)",

    generatedAt:
      new Date().toISOString(),

    executiveSummary: [
      `Estimated project cost: ${formatCurrency(
        estimate.summary.estimatedBudget,
      )}`,
      `Estimated rate per sq.ft: ${formatCurrency(
        estimate.summary.estimatedRatePerSqFt,
      )}`,
      `Construction grade: ${estimate.summary.suggestedGrade}`,
      `Project area: ${estimate.request.builtUpAreaSqFt.toLocaleString("en-IN")} sq.ft`,
      `Floors: ${(estimate.request.floorCount ?? 1).toLocaleString("en-IN")}`,
    ],

    sections,

    financialSummary: {
      estimatedProjectCost:
        estimate.summary.estimatedBudget,

      estimatedCivilCost:
        estimate.costing.civilCost,

      estimatedElectricalCost:
        estimate.costing.electricalCost,

      estimatedPlumbingCost:
        estimate.costing.plumbingCost,

      estimatedFinishingCost:
        estimate.costing.finishingCost,

      recommendedContingency:
        contingency,
    },

    recommendations: [
      "Final structural design must be approved by a licensed structural engineer.",
      "District-wise market rate escalation should be reviewed periodically.",
      "PWD itemization should be validated before tender publication.",
      "Vendor quotations should include GST, transportation and unloading charges.",
      "High-rise projects require lift-core, fire and evacuation compliance review.",
    ],
  };
}
