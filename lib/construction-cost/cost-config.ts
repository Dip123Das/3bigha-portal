export type ConstructionGrade = "economy" | "standard" | "premium";

export type ConstructionCostComponent =
  | "materials"
  | "labour"
  | "finishing"
  | "contractorMargin"
  | "miscellaneous";

export type ConstructionRegionKey = string;

export type ConstructionCostSplit = Record<ConstructionCostComponent, number>;

export type ConstructionBaseRateConfig = {
  grade: ConstructionGrade;
  label: string;
  description: string;
  baseRatePerSqFt: number;
  minRatePerSqFt: number;
  maxRatePerSqFt: number;
};

export const CONSTRUCTION_GRADES: Record<
  ConstructionGrade,
  ConstructionBaseRateConfig
> = {
  economy: {
    grade: "economy",
    label: "Economy",
    description:
      "Basic construction with cost-conscious materials and standard workmanship.",
    baseRatePerSqFt: 1450,
    minRatePerSqFt: 1250,
    maxRatePerSqFt: 1650,
  },
  standard: {
    grade: "standard",
    label: "Standard",
    description:
      "Balanced quality construction with branded core materials and standard finishing.",
    baseRatePerSqFt: 1800,
    minRatePerSqFt: 1650,
    maxRatePerSqFt: 2150,
  },
  premium: {
    grade: "premium",
    label: "Premium",
    description:
      "Higher quality construction with branded materials, better fittings and premium finishing.",
    baseRatePerSqFt: 2450,
    minRatePerSqFt: 2200,
    maxRatePerSqFt: 3000,
  },
};

export const DEFAULT_CONSTRUCTION_COST_SPLIT: ConstructionCostSplit = {
  materials: 0.58,
  labour: 0.22,
  finishing: 0.12,
  contractorMargin: 0.05,
  miscellaneous: 0.03,
};

export const GRADE_COST_SPLITS: Record<
  ConstructionGrade,
  ConstructionCostSplit
> = {
  economy: {
    materials: 0.56,
    labour: 0.25,
    finishing: 0.09,
    contractorMargin: 0.05,
    miscellaneous: 0.05,
  },
  standard: {
    materials: 0.58,
    labour: 0.22,
    finishing: 0.12,
    contractorMargin: 0.05,
    miscellaneous: 0.03,
  },
  premium: {
    materials: 0.62,
    labour: 0.18,
    finishing: 0.14,
    contractorMargin: 0.04,
    miscellaneous: 0.02,
  },
};

export const REGIONAL_COST_MULTIPLIERS: Record<string, number> = {
  default: 1,
  west_bengal: 1,
  cooch_behar: 0.94,
  north_bengal: 0.96,
  kolkata: 1.16,
  assam: 1.04,
  bihar: 0.98,
  odisha: 1.02,
};

export const FLOOR_COST_MULTIPLIERS: Record<number, number> = {
  1: 1,
  2: 1.06,
  3: 1.11,
  4: 1.16,
  5: 1.22,
};

export const DEFAULT_COST_ENGINE_ASSUMPTIONS = {
  currency: "INR",
  unit: "sqft",
  defaultGrade: "standard" satisfies ConstructionGrade,
  defaultRegion: "default" satisfies ConstructionRegionKey,
  minimumBuiltUpArea: 100,
  maximumBuiltUpArea: 100000,
  minimumFloorCount: -3,
  maximumFloorCount: 20,
  boqReady: true,
};