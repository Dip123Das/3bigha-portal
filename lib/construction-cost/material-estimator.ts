import {
  MATERIAL_ESTIMATION_RULES,
  MATERIAL_GRADE_MULTIPLIERS,
} from "./material-rules";

import type {
  MaterialEstimateInput,
  MaterialEstimateResult,
} from "./material-types";

import type { ConstructionGrade } from "./cost-config";

function sanitizeArea(value: number): number {
  if (!Number.isFinite(value)) return 1000;
  return Math.max(100, Math.min(Math.round(value), 100000));
}

function sanitizeFloorCount(value?: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(Math.round(value ?? 1), 20));
}

function normalizeGrade(value?: ConstructionGrade): ConstructionGrade {
  if (value === "economy" || value === "standard" || value === "premium") {
    return value;
  }

  return "standard";
}

function roundMaterialQuantity(value: number, unit: string): number {
  if (unit === "kg") return Math.round(value / 10) * 10;
  if (unit === "pcs") return Math.round(value);
  if (unit === "points") return Math.max(1, Math.round(value));
  if (unit === "bags") return Math.max(1, Math.ceil(value));
  return Math.round(value);
}

export function estimateConstructionMaterials(
  input: MaterialEstimateInput,
): MaterialEstimateResult {
  const builtUpAreaSqFt = sanitizeArea(input.builtUpAreaSqFt);
  const floorCount = sanitizeFloorCount(input.floorCount);
  const grade = normalizeGrade(input.grade);

  const gradeMultiplier = MATERIAL_GRADE_MULTIPLIERS[grade] ?? 1;

  const floorMultiplier =
    floorCount <= 1 ? 1 : 1 + Math.min(floorCount - 1, 10) * 0.04;

  const items = MATERIAL_ESTIMATION_RULES.map((rule) => {
    const rawQuantity =
      builtUpAreaSqFt *
      rule.quantityPerSqFt *
      gradeMultiplier *
      floorMultiplier;

    return {
      key: rule.key,
      label: rule.label,
      quantity: roundMaterialQuantity(rawQuantity, rule.unit),
      unit: rule.unit,
      note: rule.note,
      rfqReadyName: rule.rfqReadyName,
    };
  });

  return {
    builtUpAreaSqFt,
    floorCount,
    grade,
    items,
    assumptions: [
      "This is an indicative material estimate for early planning only.",
      "Final quantity depends on architectural plan, structural design, soil condition, wall thickness and site wastage.",
      "TMT steel quantity must be finalized by a structural engineer.",
      "Electrical and plumbing points are approximate and should be verified from the final room layout.",
    ],
  };
}

export function buildMaterialRfqDescription(
  estimate: MaterialEstimateResult,
): string {
  const lines = estimate.items.map(
    (item) =>
      `• ${item.rfqReadyName}: approx ${item.quantity} ${item.unit}`,
  );

  return [
    "AI Material Quantity Estimate:",
    `Built-up area: ${estimate.builtUpAreaSqFt} sq.ft`,
    `Floors: ${estimate.floorCount}`,
    `Grade: ${estimate.grade}`,
    "",
    "Estimated Materials:",
    ...lines,
    "",
    "Note: Please quote brand, grade, delivery charges, GST/invoice status and availability.",
  ].join("\n");
}