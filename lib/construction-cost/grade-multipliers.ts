import type { ConstructionGrade } from "./cost-config";

export type GradeMultiplierConfig = {
  grade: ConstructionGrade;
  structuralMultiplier: number;
  materialMultiplier: number;
  labourMultiplier: number;
  finishingMultiplier: number;
  serviceMultiplier: number;
  aiBoqComplexityMultiplier: number;
};

export const GRADE_MULTIPLIERS: Record<
  ConstructionGrade,
  GradeMultiplierConfig
> = {
  economy: {
    grade: "economy",
    structuralMultiplier: 0.94,
    materialMultiplier: 0.9,
    labourMultiplier: 0.96,
    finishingMultiplier: 0.78,
    serviceMultiplier: 0.85,
    aiBoqComplexityMultiplier: 0.9,
  },
  standard: {
    grade: "standard",
    structuralMultiplier: 1,
    materialMultiplier: 1,
    labourMultiplier: 1,
    finishingMultiplier: 1,
    serviceMultiplier: 1,
    aiBoqComplexityMultiplier: 1,
  },
  premium: {
    grade: "premium",
    structuralMultiplier: 1.12,
    materialMultiplier: 1.24,
    labourMultiplier: 1.08,
    finishingMultiplier: 1.45,
    serviceMultiplier: 1.28,
    aiBoqComplexityMultiplier: 1.25,
  },
};

export function getGradeMultiplier(
  grade: ConstructionGrade,
): GradeMultiplierConfig {
  return GRADE_MULTIPLIERS[grade] ?? GRADE_MULTIPLIERS.standard;
}