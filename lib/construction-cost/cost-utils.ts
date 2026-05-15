import {
  CONSTRUCTION_GRADES,
  DEFAULT_CONSTRUCTION_COST_SPLIT,
  DEFAULT_COST_ENGINE_ASSUMPTIONS,
  FLOOR_COST_MULTIPLIERS,
  GRADE_COST_SPLITS,
  REGIONAL_COST_MULTIPLIERS,
  type ConstructionCostComponent,
  type ConstructionCostSplit,
  type ConstructionGrade,
  type ConstructionRegionKey,
} from "./cost-config";
import { getGradeMultiplier } from "./grade-multipliers";

export type ConstructionCostInput = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  region?: ConstructionRegionKey;
  customRatePerSqFt?: number;
  roomCount?: number;
  bathroomCount?: number;
  kitchenCount?: number;
  hasInteriorWork?: boolean;
};

export type ConstructionCostBreakupItem = {
  component: ConstructionCostComponent;
  label: string;
  percentage: number;
  amount: number;
};

export type ConstructionCostEstimate = {
  grade: ConstructionGrade;
  region: ConstructionRegionKey;
  builtUpAreaSqFt: number;
  floorCount: number;
  roomCount: number;
  bathroomCount: number;
  kitchenCount: number;
  hasInteriorWork: boolean;
  ratePerSqFt: number;
  minRatePerSqFt: number;
  maxRatePerSqFt: number;
  estimatedTotal: number;
  estimatedMinTotal: number;
  estimatedMaxTotal: number;
  regionalMultiplier: number;
  floorMultiplier: number;
  gradeMultiplier: number;
  roomComplexityMultiplier: number;
  wetAreaMultiplier: number;
  interiorMultiplier: number;
  split: ConstructionCostSplit;
  breakup: ConstructionCostBreakupItem[];
  assumptions: {
    currency: string;
    unit: string;
    boqReady: boolean;
    note: string;
  };
};

const COMPONENT_LABELS: Record<ConstructionCostComponent, string> = {
  materials: "Materials",
  labour: "Labour",
  finishing: "Finishing",
  contractorMargin: "Contractor Margin",
  miscellaneous: "Miscellaneous",
};

export function normalizeConstructionGrade(
  grade?: string | null,
): ConstructionGrade {
  if (grade === "economy" || grade === "standard" || grade === "premium") {
    return grade;
  }

  return "standard";
}

export function normalizeConstructionRegion(
  region?: string | null,
): ConstructionRegionKey {
  if (!region) return "default";

  const normalized = region
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  if (normalized in REGIONAL_COST_MULTIPLIERS) {
    return normalized as ConstructionRegionKey;
  }

  return "default";
}

export function getRegionalMultiplier(region?: string | null): number {
  const key = normalizeConstructionRegion(region);
  return REGIONAL_COST_MULTIPLIERS[key] ?? REGIONAL_COST_MULTIPLIERS.default;
}

export function sanitizeBuiltUpArea(area: number): number {
  if (!Number.isFinite(area)) {
    return DEFAULT_COST_ENGINE_ASSUMPTIONS.minimumBuiltUpArea;
  }

  return Math.min(
    Math.max(Math.round(area), DEFAULT_COST_ENGINE_ASSUMPTIONS.minimumBuiltUpArea),
    DEFAULT_COST_ENGINE_ASSUMPTIONS.maximumBuiltUpArea,
  );
}

export function sanitizeFloorCount(floorCount?: number): number {
  if (!Number.isFinite(floorCount)) {
    return DEFAULT_COST_ENGINE_ASSUMPTIONS.minimumFloorCount;
  }

  return Math.min(
    Math.max(
      Math.round(floorCount ?? 1),
      DEFAULT_COST_ENGINE_ASSUMPTIONS.minimumFloorCount,
    ),
    DEFAULT_COST_ENGINE_ASSUMPTIONS.maximumFloorCount,
  );
}

export function sanitizeCount(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;

  return Math.min(Math.max(Math.round(value ?? fallback), min), max);
}

export function getFloorMultiplier(floorCount?: number): number {
  const safeFloorCount = sanitizeFloorCount(floorCount);

  if (safeFloorCount in FLOOR_COST_MULTIPLIERS) {
    return FLOOR_COST_MULTIPLIERS[safeFloorCount];
  }

  return 1.22 + Math.max(0, safeFloorCount - 5) * 0.035;
}

export function getRoomComplexityMultiplier(roomCount?: number): number {
  const safeRoomCount = sanitizeCount(roomCount, 3, 1, 12);

  if (safeRoomCount <= 3) return 1;

  return 1 + (safeRoomCount - 3) * 0.018;
}

export function getWetAreaMultiplier(bathroomCount?: number, kitchenCount?: number): number {
  const safeBathroomCount = sanitizeCount(bathroomCount, 2, 1, 10);
  const safeKitchenCount = sanitizeCount(kitchenCount, 1, 1, 5);

  const extraBathrooms = Math.max(0, safeBathroomCount - 2);
  const extraKitchens = Math.max(0, safeKitchenCount - 1);

  return 1 + extraBathrooms * 0.035 + extraKitchens * 0.045;
}

export function getInteriorMultiplier(hasInteriorWork?: boolean): number {
  return hasInteriorWork ? 1.08 : 1;
}

export function roundCurrency(value: number): number {
  return Math.round(value);
}

export function calculateRatePerSqFt(input: ConstructionCostInput): {
  ratePerSqFt: number;
  minRatePerSqFt: number;
  maxRatePerSqFt: number;
  regionalMultiplier: number;
  floorMultiplier: number;
  gradeMultiplier: number;
  roomComplexityMultiplier: number;
  wetAreaMultiplier: number;
  interiorMultiplier: number;
} {
  const grade = normalizeConstructionGrade(input.grade);
  const region = normalizeConstructionRegion(input.region);
  const gradeConfig = CONSTRUCTION_GRADES[grade];
  const gradeMultiplierConfig = getGradeMultiplier(grade);

  const regionalMultiplier = getRegionalMultiplier(region);
  const floorMultiplier = getFloorMultiplier(input.floorCount);
  const gradeMultiplier = gradeMultiplierConfig.aiBoqComplexityMultiplier;
  const roomComplexityMultiplier = getRoomComplexityMultiplier(input.roomCount);
  const wetAreaMultiplier = getWetAreaMultiplier(input.bathroomCount, input.kitchenCount);
  const interiorMultiplier = getInteriorMultiplier(input.hasInteriorWork);

  const baseRate =
    typeof input.customRatePerSqFt === "number" && input.customRatePerSqFt > 0
      ? input.customRatePerSqFt
      : gradeConfig.baseRatePerSqFt;

  const multiplier =
    regionalMultiplier *
    floorMultiplier *
    roomComplexityMultiplier *
    wetAreaMultiplier *
    interiorMultiplier;

  return {
    ratePerSqFt: roundCurrency(baseRate * multiplier),
    minRatePerSqFt: roundCurrency(gradeConfig.minRatePerSqFt * multiplier),
    maxRatePerSqFt: roundCurrency(gradeConfig.maxRatePerSqFt * multiplier),
    regionalMultiplier,
    floorMultiplier,
    gradeMultiplier,
    roomComplexityMultiplier,
    wetAreaMultiplier,
    interiorMultiplier,
  };
}

export function getConstructionCostSplit(
  grade?: ConstructionGrade,
): ConstructionCostSplit {
  return GRADE_COST_SPLITS[grade ?? "standard"] ?? DEFAULT_CONSTRUCTION_COST_SPLIT;
}

export function createCostBreakup(
  totalAmount: number,
  split: ConstructionCostSplit,
): ConstructionCostBreakupItem[] {
  return Object.entries(split).map(([component, percentage]) => ({
    component: component as ConstructionCostComponent,
    label: COMPONENT_LABELS[component as ConstructionCostComponent],
    percentage,
    amount: roundCurrency(totalAmount * percentage),
  }));
}

export function estimateConstructionCost(
  input: ConstructionCostInput,
): ConstructionCostEstimate {
  const grade = normalizeConstructionGrade(input.grade);
  const region = normalizeConstructionRegion(input.region);
  const builtUpAreaSqFt = sanitizeBuiltUpArea(input.builtUpAreaSqFt);
  const floorCount = sanitizeFloorCount(input.floorCount);
  const roomCount = sanitizeCount(input.roomCount, 3, 1, 12);
  const bathroomCount = sanitizeCount(input.bathroomCount, 2, 1, 10);
  const kitchenCount = sanitizeCount(input.kitchenCount, 1, 1, 5);
  const hasInteriorWork = Boolean(input.hasInteriorWork);

  const {
    ratePerSqFt,
    minRatePerSqFt,
    maxRatePerSqFt,
    regionalMultiplier,
    floorMultiplier,
    gradeMultiplier,
    roomComplexityMultiplier,
    wetAreaMultiplier,
    interiorMultiplier,
  } = calculateRatePerSqFt({
    ...input,
    grade,
    region,
    floorCount,
    roomCount,
    bathroomCount,
    kitchenCount,
    hasInteriorWork,
  });

  const estimatedTotal = roundCurrency(builtUpAreaSqFt * ratePerSqFt);
  const estimatedMinTotal = roundCurrency(builtUpAreaSqFt * minRatePerSqFt);
  const estimatedMaxTotal = roundCurrency(builtUpAreaSqFt * maxRatePerSqFt);

  const split = getConstructionCostSplit(grade);
  const breakup = createCostBreakup(estimatedTotal, split);

  return {
    grade,
    region,
    builtUpAreaSqFt,
    floorCount,
    roomCount,
    bathroomCount,
    kitchenCount,
    hasInteriorWork,
    ratePerSqFt,
    minRatePerSqFt,
    maxRatePerSqFt,
    estimatedTotal,
    estimatedMinTotal,
    estimatedMaxTotal,
    regionalMultiplier,
    floorMultiplier,
    gradeMultiplier,
    roomComplexityMultiplier,
    wetAreaMultiplier,
    interiorMultiplier,
    split,
    breakup,
    assumptions: {
      currency: DEFAULT_COST_ENGINE_ASSUMPTIONS.currency,
      unit: DEFAULT_COST_ENGINE_ASSUMPTIONS.unit,
      boqReady: DEFAULT_COST_ENGINE_ASSUMPTIONS.boqReady,
      note:
        "This is an indicative construction cost estimate. Final quotation may vary based on soil condition, foundation design, material brand, labour availability, transport, MEP scope, room layout, number of bathrooms/kitchens and finishing level.",
    },
  };
}

export function formatIndianCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getConstructionEstimateSummary(
  estimate: ConstructionCostEstimate,
): string {
  return `${estimate.builtUpAreaSqFt} sq.ft ${estimate.grade} construction in ${estimate.region} with ${estimate.roomCount} room(s), ${estimate.bathroomCount} bathroom(s) and ${estimate.kitchenCount} kitchen(s) is estimated around ${formatIndianCurrency(
    estimate.estimatedTotal,
  )}, approximately ${formatIndianCurrency(
    estimate.ratePerSqFt,
  )} per sq.ft. Expected range: ${formatIndianCurrency(
    estimate.estimatedMinTotal,
  )} to ${formatIndianCurrency(estimate.estimatedMaxTotal)}.`;
}
