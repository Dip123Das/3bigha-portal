import type {
  ConstructionGrade,
  ConstructionRegionKey,
} from "./cost-config";

export type ConstructionProjectType =
  | "residential"
  | "commercial"
  | "rental"
  | "villa"
  | "apartment"
  | "warehouse";

export type ConstructionEstimateRequest = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  region?: ConstructionRegionKey;

  projectType?: ConstructionProjectType;

  includeFinishing?: boolean;
  includeElectrical?: boolean;
  includePlumbing?: boolean;
  includeInterior?: boolean;

  customRatePerSqFt?: number;
};

export type ConstructionEstimateMeta = {
  generatedAt: string;
  aiReady: boolean;
  boqReady: boolean;
  seoReady: boolean;
  procurementReady: boolean;
};

export type ConstructionEstimateResponse = {
  success: boolean;

  estimateId: string;

  request: ConstructionEstimateRequest;

  summary: {
    estimatedBudget: number;
    estimatedBudgetMin: number;
    estimatedBudgetMax: number;

    estimatedRatePerSqFt: number;

    suggestedGrade: ConstructionGrade;

    recommendedContingencyPercent: number;
  };

  costing: {
    civilCost: number;
    finishingCost: number;
    electricalCost: number;
    plumbingCost: number;
    interiorCost: number;
  };

  analytics: {
    areaEfficiencyScore: number;
    pricingConfidenceScore: number;
    regionalAdjustmentApplied: boolean;
    premiumFactorApplied: boolean;
  };

  meta: ConstructionEstimateMeta;
};