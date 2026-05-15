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
  ratePerSqFt: number;
  minRatePerSqFt: number;
  maxRatePerSqFt: number;
  estimatedTotal: number;
  estimatedMinTotal: number;
  estimatedMaxTotal: number;
  regionalMultiplier: number;
  floorMultiplier: number;
  gradeMultiplier: number;
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

export function getFloorMultiplier(floorCount?: number): number {
  const safeFloorCount = sanitizeFloorCount(floorCount);

  if (safeFloorCount in FLOOR_COST_MULTIPLIERS) {
    return FLOOR_COST_MULTIPLIERS[safeFloorCount];
  }

  return 1.22 + Math.max(0, safeFloorCount - 5) * 0.035;
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
} {
  const grade = normalizeConstructionGrade(input.grade);
  const region = normalizeConstructionRegion(input.region);
  const gradeConfig = CONSTRUCTION_GRADES[grade];
  const gradeMultiplierConfig = getGradeMultiplier(grade);

  const regionalMultiplier = getRegionalMultiplier(region);
  const floorMultiplier = getFloorMultiplier(input.floorCount);
  const gradeMultiplier = gradeMultiplierConfig.aiBoqComplexityMultiplier;

  const baseRate =
    typeof input.customRatePerSqFt === "number" && input.customRatePerSqFt > 0
      ? input.customRatePerSqFt
      : gradeConfig.baseRatePerSqFt;

  const multiplier = regionalMultiplier * floorMultiplier;

  return {
    ratePerSqFt: roundCurrency(baseRate * multiplier),
    minRatePerSqFt: roundCurrency(gradeConfig.minRatePerSqFt * multiplier),
    maxRatePerSqFt: roundCurrency(gradeConfig.maxRatePerSqFt * multiplier),
    regionalMultiplier,
    floorMultiplier,
    gradeMultiplier,
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

  const {
    ratePerSqFt,
    minRatePerSqFt,
    maxRatePerSqFt,
    regionalMultiplier,
    floorMultiplier,
    gradeMultiplier,
  } = calculateRatePerSqFt({
    ...input,
    grade,
    region,
    floorCount,
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
    ratePerSqFt,
    minRatePerSqFt,
    maxRatePerSqFt,
    estimatedTotal,
    estimatedMinTotal,
    estimatedMaxTotal,
    regionalMultiplier,
    floorMultiplier,
    gradeMultiplier,
    split,
    breakup,
    assumptions: {
      currency: DEFAULT_COST_ENGINE_ASSUMPTIONS.currency,
      unit: DEFAULT_COST_ENGINE_ASSUMPTIONS.unit,
      boqReady: DEFAULT_COST_ENGINE_ASSUMPTIONS.boqReady,
      note:
        "This is an indicative construction cost estimate. Final quotation may vary based on soil condition, foundation design, material brand, labour availability, transport, MEP scope and finishing level.",
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
  return `${estimate.builtUpAreaSqFt} sq.ft ${estimate.grade} construction in ${estimate.region} is estimated around ${formatIndianCurrency(
    estimate.estimatedTotal,
  )}, approximately ${formatIndianCurrency(
    estimate.ratePerSqFt,
  )} per sq.ft. Expected range: ${formatIndianCurrency(
    estimate.estimatedMinTotal,
  )} to ${formatIndianCurrency(estimate.estimatedMaxTotal)}.`;
}