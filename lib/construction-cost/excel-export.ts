import type { ConstructionEstimateResponse } from "./cost-types";

type CsvCell = string | number | null | undefined;

function currency(value: number) {
  return Math.round(value);
}

function csvCell(value: CsvCell) {
  let text = String(value ?? "");

  // Prevent spreadsheet formula injection from text fields.
  if (typeof value === "string" && /^[\t\r\n ]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function generateConstructionCsv(
  estimate: ConstructionEstimateResponse,
) {
  const rows: CsvCell[][] = [
    ["Project Summary"],
    ["Project Cost", currency(estimate.summary.estimatedBudget)],
    ["Rate Per SqFt", currency(estimate.summary.estimatedRatePerSqFt)],
    ["Built-up Area", estimate.request.builtUpAreaSqFt],
    ["Floors", estimate.request.floorCount ?? 1],
    ["Grade", estimate.summary.suggestedGrade],
    [],
    ["Costing"],
    ["Category", "Amount"],
    ["Civil Works", currency(estimate.costing.civilCost)],
    ["Finishing", currency(estimate.costing.finishingCost)],
    ["Electrical", currency(estimate.costing.electricalCost)],
    ["Plumbing", currency(estimate.costing.plumbingCost)],
    ["Interior", currency(estimate.costing.interiorCost)],
  ];

  if (estimate.pwdItemization) {
    rows.push(
      [],
      ["PWD BOQ"],
      ["Chapter", "Code", "Description", "Quantity", "Unit", "Rate", "Amount"],
    );

    for (const item of [
      ...estimate.pwdItemization.civilItems,
      ...estimate.pwdItemization.plumbingItems,
      ...estimate.pwdItemization.electricalItems,
      ...estimate.pwdItemization.finishingItems,
    ]) {
      rows.push([
        item.chapter,
        item.itemCode,
        item.description,
        item.quantity,
        item.unit,
        currency(item.rate),
        currency(item.amount),
      ]);
    }
  }

  if (estimate.roomPlanning) {
    rows.push(
      [],
      ["Planning"],
      ["Bedrooms", estimate.roomPlanning.estimatedBedrooms],
      ["Bathrooms", estimate.roomPlanning.estimatedBathrooms],
      ["Kitchens", estimate.roomPlanning.estimatedKitchens],
      ["Parking", estimate.roomPlanning.estimatedParkingSlots],
      ["Efficiency", `${estimate.roomPlanning.efficiencyPercent}%`],
    );
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
