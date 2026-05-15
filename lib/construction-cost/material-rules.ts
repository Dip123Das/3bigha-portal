import type { ConstructionGrade } from "./cost-config";

export type MaterialRule = {
  key: string;
  label: string;
  unit: string;
  quantityPerSqFt: number;
  rfqReadyName: string;
  note: string;
};

export const MATERIAL_GRADE_MULTIPLIERS: Record<ConstructionGrade, number> = {
  economy: 0.92,
  standard: 1,
  premium: 1.08,
};

export const MATERIAL_ESTIMATION_RULES: MaterialRule[] = [
  {
    key: "cement",
    label: "Cement",
    unit: "bags",
    quantityPerSqFt: 0.45,
    rfqReadyName: "Cement bags",
    note: "Approximate cement requirement for RCC, masonry and plastering.",
  },
  {
    key: "tmt_steel",
    label: "TMT Steel",
    unit: "kg",
    quantityPerSqFt: 4.2,
    rfqReadyName: "TMT steel rod",
    note: "Approximate steel requirement. Final quantity depends on structural design.",
  },
  {
    key: "sand",
    label: "Sand",
    unit: "cft",
    quantityPerSqFt: 1.8,
    rfqReadyName: "Construction sand",
    note: "Approximate sand quantity for concrete, masonry and plastering.",
  },
  {
    key: "stone_chips",
    label: "Stone Chips",
    unit: "cft",
    quantityPerSqFt: 1.25,
    rfqReadyName: "Stone chips / aggregate",
    note: "Approximate aggregate requirement for RCC and concrete work.",
  },
  {
    key: "bricks",
    label: "Bricks / Blocks",
    unit: "pcs",
    quantityPerSqFt: 8.5,
    rfqReadyName: "Bricks / blocks",
    note: "Approximate walling material. Depends on wall thickness and design.",
  },
  {
    key: "floor_tiles",
    label: "Floor Tiles",
    unit: "sq.ft",
    quantityPerSqFt: 0.9,
    rfqReadyName: "Floor tiles",
    note: "Approximate tile area excluding wastage variation.",
  },
  {
    key: "electrical_points",
    label: "Electrical Points",
    unit: "points",
    quantityPerSqFt: 0.018,
    rfqReadyName: "Electrical wiring points",
    note: "Approximate electrical point estimate for residential planning.",
  },
  {
    key: "plumbing_points",
    label: "Plumbing Points",
    unit: "points",
    quantityPerSqFt: 0.008,
    rfqReadyName: "Plumbing points",
    note: "Approximate plumbing point estimate for kitchen and bathroom usage.",
  },
];