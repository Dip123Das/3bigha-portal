import {
  PWD_CORE_SOR_ITEMS,
  getPwdDistrictChargePercent,
} from "./pwd-sor-rates";

import {
  applyLiveMarketAdjustmentToLine,
} from "./pwd-price-sync";
import type { PwdCostLine, PwdCostSummary, PwdSorDomain } from "./pwd-sor-types";

export type PwdEstimateInput = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  basementCount?: number;
  districtKey?: string;
  includeSanitary?: boolean;
  includeElectrical?: boolean;
  gstPercent?: number;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(value, max));
}

function roundMoney(value: number) {
  return Math.round(value);
}

function applyDistrictCharge(rate: number, districtKey: string, domain: PwdSorDomain) {
  const charge = getPwdDistrictChargePercent(districtKey, domain);
  return rate * (1 + charge / 100);
}

export function generatePwdScheduleEstimate(input: PwdEstimateInput) {
  const area = clamp(Math.round(input.builtUpAreaSqFt || 1000), 100, 10000000);
  const floors = clamp(Math.round(input.floorCount ?? 1), 1, 75);
  const basements = clamp(Math.round(input.basementCount ?? 0), 0, 5);
  const districtKey = input.districtKey || "kolkata_zone";

  const structuralVolumeCum = area * 0.085;
  const masonryVolumeCum = area * 0.055;
  const sanitaryPipeLengthM = area * 0.018 + basements * 25;
  const drainagePipeLengthM = area * 0.012 + basements * 30;
  const electricalPoints = Math.max(12, Math.round(area / 95));
  const fanCount = Math.max(2, Math.round(area / 350));
  const dbCount = Math.max(1, Math.ceil(floors / 4));

  const quantityByCode: Record<string, number> = {
    "BLDG-RCC-INDICATIVE": structuralVolumeCum,
    "BLDG-BRICKWORK-INDICATIVE": masonryVolumeCum,
    "SAN-GI-PIPE-15-EXPOSED-2017": input.includeSanitary === false ? 0 : sanitaryPipeLengthM,
    "SAN-DWC-HDPE-SN8-150-2017": input.includeSanitary === false ? 0 : drainagePipeLengthM,
    "ELEC-FIX-CEILING-FAN-2017": input.includeElectrical === false ? 0 : fanCount,
    "ELEC-SPN-MCBDB-2017": input.includeElectrical === false ? 0 : dbCount,
    "ELEC-WIRING-POINT-INDICATIVE": input.includeElectrical === false ? 0 : electricalPoints,
  };

  const lines = PWD_CORE_SOR_ITEMS
    .map((item) => {
      const quantity = quantityByCode[item.code] ?? 0;
      const rate = applyDistrictCharge(item.baseRate, districtKey, item.domain);
      const amount = quantity * rate;

      return {
        code: item.code,
        label: item.label,
        domain: item.domain,
        unit: item.unit,
        quantity: Number(quantity.toFixed(2)),
        rate: roundMoney(rate),
        amount: roundMoney(amount),
        sourceNote: item.sourceNote,
      };
    })
    .filter((line) => line.quantity > 0)
    .map((line) =>
      applyLiveMarketAdjustmentToLine(line),
    );

  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));
  const gst = roundMoney(subtotal * ((input.gstPercent ?? 18) / 100));
  const labourWelfareCess = roundMoney((subtotal + gst) * 0.01);
  const contingency = roundMoney((subtotal + gst) * 0.03);
  const grandTotal = subtotal + gst + labourWelfareCess + contingency;

  const summary: PwdCostSummary = {
    subtotal,
    gst,
    labourWelfareCess,
    contingency,
    grandTotal,
  };

  return {
    area,
    floors,
    basements,
    districtKey,
    lines,
    summary,
    notes: [
      "This is a schedule-guided PWD estimate foundation, not the final certified government estimate.",
      "Exact PWD costing requires full item-code extraction and engineer-approved quantity measurement.",
      "GST, labour welfare cess and contingency are shown separately for DPR-style costing.",
      "Price Today override will be connected after the core PWD item engine is stable.",
    ],
  };
}
