import { buildBoqRfqDescription, generateBoqEstimate } from "./boq-generator";
import { buildMaterialRfqDescription, estimateConstructionMaterials } from "./material-estimator";
import { buildProcurementScheduleRfqDescription, generateProcurementPhaseSchedule } from "./procurement-phase-engine";
import { buildTimelineRfqDescription, estimateConstructionTimeline } from "./timeline-estimator";

import type { ConstructionGrade } from "./cost-config";

export type AutoConstructionRfqInput = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  roomCount?: number;
  bathroomCount?: number;
  kitchenCount?: number;
  hasInteriorWork?: boolean;
  projectStartDate?: string;
  city?: string;
  locality?: string;
  pincode?: string;
};

export type AutoConstructionRfqModule = "materials" | "services" | "rentals";

export type AutoConstructionRfqPackage = {
  key: string;
  module: AutoConstructionRfqModule;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  suggestedItems: {
    item_name: string;
    qty?: number;
    unit?: string;
    notes?: string;
  }[];
};

export type AutoConstructionRfqPlan = {
  input: AutoConstructionRfqInput;
  packages: AutoConstructionRfqPackage[];
  planningSummary: string;
};

export function buildAutoConstructionRfqPlan(
  input: AutoConstructionRfqInput,
): AutoConstructionRfqPlan {
  const materialEstimate = estimateConstructionMaterials({
    builtUpAreaSqFt: input.builtUpAreaSqFt,
    floorCount: input.floorCount,
    grade: input.grade,
  });

  const boq = generateBoqEstimate({
    builtUpAreaSqFt: input.builtUpAreaSqFt,
    floorCount: input.floorCount,
    grade: input.grade,
    roomCount: input.roomCount,
    bathroomCount: input.bathroomCount,
    kitchenCount: input.kitchenCount,
  });

  const timeline = estimateConstructionTimeline({
    builtUpAreaSqFt: input.builtUpAreaSqFt,
    floorCount: input.floorCount,
    grade: input.grade,
    roomCount: input.roomCount,
    bathroomCount: input.bathroomCount,
    hasInteriorWork: input.hasInteriorWork,
  });

  const procurementSchedule = generateProcurementPhaseSchedule({
    builtUpAreaSqFt: input.builtUpAreaSqFt,
    floorCount: input.floorCount,
    grade: input.grade,
    roomCount: input.roomCount,
    bathroomCount: input.bathroomCount,
    hasInteriorWork: input.hasInteriorWork,
    projectStartDate: input.projectStartDate,
  });

  const materialItems = materialEstimate.items.map((item) => ({
    item_name: item.rfqReadyName,
    qty: item.quantity,
    unit: item.unit,
    notes: item.note,
  }));

  const serviceItems = boq.items
    .filter((item) =>
      [
        "foundation",
        "rcc",
        "brickwork",
        "plaster",
        "flooring",
        "painting",
        "electrical",
        "plumbing",
      ].includes(item.category),
    )
    .map((item) => ({
      item_name: item.rfqReadyName,
      qty: item.quantity,
      unit: item.unit,
      notes: `${item.vendorCategory}. ${item.note}`,
    }));

  const rentalItems = procurementSchedule.triggers
    .filter((trigger) => trigger.rfqCategory === "rentals")
    .map((trigger) => ({
      item_name: trigger.rfqReadyName,
      qty: trigger.phaseDurationDays,
      unit: "days",
      notes: `${trigger.description} Trigger date: ${trigger.triggerDate}`,
    }));

  const packages: AutoConstructionRfqPackage[] = [
    {
      key: "materials-core",
      module: "materials",
      title: "Construction materials supply RFQ",
      description: [
        buildMaterialRfqDescription(materialEstimate),
        "",
        buildProcurementScheduleRfqDescription(procurementSchedule),
      ].join("\n"),
      priority: "critical",
      suggestedItems: materialItems,
    },
    {
      key: "construction-services",
      module: "services",
      title: "Construction labour and service RFQ",
      description: [
        buildBoqRfqDescription(boq),
        "",
        buildTimelineRfqDescription(timeline),
      ].join("\n"),
      priority: "high",
      suggestedItems: serviceItems,
    },
  ];

  if (rentalItems.length > 0) {
    packages.push({
      key: "construction-rentals",
      module: "rentals",
      title: "Construction equipment rental RFQ",
      description: buildProcurementScheduleRfqDescription(procurementSchedule),
      priority: "high",
      suggestedItems: rentalItems,
    });
  }

  return {
    input,
    packages,
    planningSummary: `AI prepared ${packages.length} RFQ package(s) for ${input.builtUpAreaSqFt} sq.ft ${input.grade ?? "standard"} construction.`,
  };
}