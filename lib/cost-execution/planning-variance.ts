export type CostPlanLineLike = {
  id: string;
  line_type: string;
  item_name: string;
  quantity: number | string;
  revised_quantity?: number | string | null;
  unit: string;
  wastage_percent: number | string;
  estimated_rate: number | string;
  revised_rate: number | string;
  estimated_amount: number | string;
  revised_amount: number | string;
};

export type CostActualEntryLike = {
  plan_line_id?: string | null;
  entry_type: string;
  quantity: number | string;
  rate: number | string;
  amount: number | string;
};

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function currentPlannedQuantity(line: CostPlanLineLike): number {
  const revised = line.revised_quantity;
  return revised === null || revised === undefined || revised === ""
    ? num(line.quantity)
    : num(revised);
}

export function currentPlannedRate(line: CostPlanLineLike): number {
  const revised = num(line.revised_rate);
  return revised > 0 ? revised : num(line.estimated_rate);
}

export function plannedQuantityWithWastage(
  line: CostPlanLineLike
): number {
  const quantity = currentPlannedQuantity(line);
  const wastage = Math.max(0, num(line.wastage_percent));
  return round(quantity * (1 + wastage / 100), 4);
}

export function currentPlannedAmount(line: CostPlanLineLike): number {
  const revisedAmount = num(line.revised_amount);
  if (revisedAmount > 0) return revisedAmount;

  const explicitEstimated = num(line.estimated_amount);
  const quantity = plannedQuantityWithWastage(line);
  const rate = currentPlannedRate(line);

  return round(
    explicitEstimated > 0 && num(line.revised_quantity) <= 0 && num(line.revised_rate) <= 0
      ? explicitEstimated
      : quantity * rate,
    2
  );
}

export function actualQuantityForPlanLine(
  lineId: string,
  entries: CostActualEntryLike[]
): number {
  let total = 0;

  for (const entry of entries) {
    if (entry.plan_line_id !== lineId) continue;
    const quantity = Math.max(0, num(entry.quantity));

    if (entry.entry_type === "material_return") {
      total -= quantity;
    } else if (quantity > 0) {
      total += quantity;
    }
  }

  return round(Math.max(0, total), 4);
}

export function actualAmountForPlanLine(
  lineId: string,
  entries: CostActualEntryLike[]
): number {
  let total = 0;

  for (const entry of entries) {
    if (entry.plan_line_id !== lineId) continue;
    const amount = Math.max(0, num(entry.amount));

    if (entry.entry_type === "material_return") {
      total -= amount;
    } else {
      total += amount;
    }
  }

  return round(Math.max(0, total), 2);
}

export function actualRateForPlanLine(
  lineId: string,
  entries: CostActualEntryLike[]
): number {
  const quantity = actualQuantityForPlanLine(lineId, entries);
  const amount = actualAmountForPlanLine(lineId, entries);
  return quantity > 0 ? round(amount / quantity, 4) : 0;
}

export type CostVarianceSignal =
  | "on_plan"
  | "over"
  | "under"
  | "not_started";

export function calculatePlanLineVariance(
  line: CostPlanLineLike,
  entries: CostActualEntryLike[]
) {
  const plannedQuantity = plannedQuantityWithWastage(line);
  const plannedRate = currentPlannedRate(line);
  const plannedAmount = currentPlannedAmount(line);

  const actualQuantity = actualQuantityForPlanLine(line.id, entries);
  const actualRate = actualRateForPlanLine(line.id, entries);
  const actualAmount = actualAmountForPlanLine(line.id, entries);

  const quantityVariance = round(actualQuantity - plannedQuantity, 4);
  const rateVariance = round(actualRate - plannedRate, 4);
  const amountVariance = round(actualAmount - plannedAmount, 2);

  const amountVariancePercent =
    plannedAmount > 0
      ? round((amountVariance / plannedAmount) * 100, 2)
      : null;

  let signal: CostVarianceSignal = "on_plan";
  if (actualAmount === 0 && actualQuantity === 0) signal = "not_started";
  else if (amountVariance > 0.01 || quantityVariance > 0.0001) signal = "over";
  else if (amountVariance < -0.01 || quantityVariance < -0.0001) signal = "under";

  return {
    plannedQuantity,
    plannedRate,
    plannedAmount,
    actualQuantity,
    actualRate,
    actualAmount,
    quantityVariance,
    rateVariance,
    amountVariance,
    amountVariancePercent,
    signal,
  };
}

export function defaultActualEntryTypeForPlanLine(lineType: string): string {
  switch (lineType) {
    case "raw_material":
    case "consumable":
      return "material_issue";
    case "labour":
    case "wages":
      return "wage";
    case "electricity":
      return "electricity";
    case "fuel":
      return "fuel";
    case "rental":
      return "rental";
    case "equipment":
    case "machinery":
      return "equipment";
    case "service":
      return "service";
    case "professional_fee":
      return "professional_fee";
    case "subcontract":
      return "subcontract";
    case "transport":
    case "logistics":
      return "transport";
    case "statutory_fee":
      return "statutory_fee";
    case "finance_cost":
      return "finance_cost";
    case "overhead":
      return "overhead";
    case "tax":
      return "tax";
    default:
      return "other";
  }
}
