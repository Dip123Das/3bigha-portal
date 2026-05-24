import { randomUUID } from "crypto";

import {
  estimateConstructionCost,
} from "./cost-utils";

import { generatePwdScheduleEstimate } from "./pwd-cost-engine";
import { calculateHighriseAdjustments } from "./highrise-engine";
import { calculateStructuralQuantities } from "./quantity-rules";
import { generateRoomPlanning } from "./room-planning-engine";
import { generatePwdItemization } from "./pwd-itemization-engine";
import { generateDprReport } from "./dpr-generator";

import type {
  ConstructionEstimateRequest,
  ConstructionEstimateResponse,
} from "./cost-types";

function getPwdDistrictKey(region?: string): string {
  if (region === "cooch_behar") return "cooch_behar";
  if (region === "north_bengal") return "north_bengal_general";
  if (region === "kolkata") return "kolkata_zone";
  return "kolkata_zone";
}

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

  const highrise = calculateHighriseAdjustments({
    builtUpAreaSqFt: request.builtUpAreaSqFt,
    floorCount: request.floorCount ?? 1,
    basementCount: request.basementCount ?? 0,
  });

  const planning = generateRoomPlanning({
    builtUpAreaSqFt: request.builtUpAreaSqFt,
    floorCount: request.floorCount ?? 1,
    basementCount: request.basementCount ?? 0,
    projectType: request.projectType,
  });

  const pwdItems = generatePwdItemization({
    builtUpAreaSqFt: request.builtUpAreaSqFt,
    floorCount: request.floorCount ?? 1,
    civilCost,
    electricalCost,
    plumbingCost,
    finishingCost,
  });

  const quantities = calculateStructuralQuantities({
    builtUpAreaSqFt: request.builtUpAreaSqFt,
    floorCount: request.floorCount ?? 1,
    basementCount: request.basementCount ?? 0,
  });

  const pwdSchedule = generatePwdScheduleEstimate({
    builtUpAreaSqFt: request.builtUpAreaSqFt,
    floorCount: request.floorCount,
    basementCount: request.basementCount,
    districtKey: getPwdDistrictKey(String(request.region || "")),
    includeSanitary: includePlumbing,
    includeElectrical,
    gstPercent: 18,
  });

  const estimateWithoutDpr: ConstructionEstimateResponse = {
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

    structuralQuantities: quantities,

    roomPlanning: planning,

    pwdItemization: pwdItems,

    analytics: {
      highriseClassification: highrise.classification,

      areaEfficiencyScore:
        request.builtUpAreaSqFt > 2500 ? 88 : 76,

      pricingConfidenceScore:
        request.scheduleMode === "pwd_sor" || request.scheduleMode === "price_today"
          ? 88
          : 82,

      regionalAdjustmentApplied:
        baseEstimate.regionalMultiplier !== 1,

      premiumFactorApplied:
        baseEstimate.grade === "premium",

      highriseEscalationPercent:
        highrise.totalEscalationPercent,

      highriseNotes:
        highrise.notes,
    },

    pwdSchedule: {
      enabled:
        request.scheduleMode === "pwd_sor" ||
        request.scheduleMode === "cpwd_dsr" ||
        request.scheduleMode === "price_today",
      mode: request.scheduleMode || "indicative",
      districtKey: pwdSchedule.districtKey,
      lines: pwdSchedule.lines,
      summary: pwdSchedule.summary,
      notes: pwdSchedule.notes,
    },

    meta: {
      generatedAt: new Date().toISOString(),

      aiReady: true,
      boqReady: true,
      seoReady: true,
      procurementReady: true,
    },
  };

  return {
    ...estimateWithoutDpr,
    dprReport: generateDprReport(estimateWithoutDpr),
  };
}
