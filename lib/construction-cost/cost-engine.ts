import { randomUUID } from "crypto";

import {
  estimateConstructionCost,
} from "./cost-utils";

import type {
  ConstructionEstimateRequest,
  ConstructionEstimateResponse,
} from "./cost-types";

export function generateConstructionEstimate(
  request: ConstructionEstimateRequest,
): ConstructionEstimateResponse {
  const baseEstimate = estimateConstructionCost({
    builtUpAreaSqFt: request.builtUpAreaSqFt,
    floorCount: request.floorCount,
    grade: request.grade,
    region: request.region,
    customRatePerSqFt: request.customRatePerSqFt,
  });

  const totalEstimate = baseEstimate.estimatedTotal;

  const includeFinishing = request.includeFinishing ?? true;
  const includeElectrical = request.includeElectrical ?? true;
  const includePlumbing = request.includePlumbing ?? true;
  const includeInterior = request.includeInterior ?? false;

  const civilCost = Math.round(totalEstimate * 0.62);

  const finishingCost = includeFinishing
    ? Math.round(totalEstimate * 0.16)
    : 0;

  const electricalCost = includeElectrical
    ? Math.round(totalEstimate * 0.08)
    : 0;

  const plumbingCost = includePlumbing
    ? Math.round(totalEstimate * 0.06)
    : 0;

  const interiorCost = includeInterior
    ? Math.round(totalEstimate * 0.12)
    : 0;

  return {
    success: true,

    estimateId: randomUUID(),

    request,

    summary: {
      estimatedBudget: totalEstimate,

      estimatedBudgetMin: baseEstimate.estimatedMinTotal,

      estimatedBudgetMax: baseEstimate.estimatedMaxTotal,

      estimatedRatePerSqFt: baseEstimate.ratePerSqFt,

      suggestedGrade: baseEstimate.grade,

      recommendedContingencyPercent: 8,
    },

    costing: {
      civilCost,
      finishingCost,
      electricalCost,
      plumbingCost,
      interiorCost,
    },

    analytics: {
      areaEfficiencyScore:
        request.builtUpAreaSqFt > 2500 ? 88 : 76,

      pricingConfidenceScore: 82,

      regionalAdjustmentApplied:
        baseEstimate.regionalMultiplier !== 1,

      premiumFactorApplied:
        baseEstimate.grade === "premium",
    },

    meta: {
      generatedAt: new Date().toISOString(),

      aiReady: true,
      boqReady: true,
      seoReady: true,
      procurementReady: true,
    },
  };
}