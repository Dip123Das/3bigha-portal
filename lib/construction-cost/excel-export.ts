import * as XLSX from "xlsx";

import type {
  ConstructionEstimateResponse,
} from "./cost-types";

function currency(value: number) {
  return Math.round(value);
}

export function generateConstructionWorkbook(
  estimate: ConstructionEstimateResponse,
) {
  const workbook =
    XLSX.utils.book_new();

  const summarySheet =
    XLSX.utils.json_to_sheet([
      {
        "Project Cost":
          currency(
            estimate.summary.estimatedBudget,
          ),

        "Rate Per SqFt":
          currency(
            estimate.summary.estimatedRatePerSqFt,
          ),

        "Built-up Area":
          estimate.request.builtUpAreaSqFt,

        Floors:
          estimate.request.floorCount ?? 1,

        Grade:
          estimate.summary.suggestedGrade,
      },
    ]);

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    "Project Summary",
  );

  const costingSheet =
    XLSX.utils.json_to_sheet([
      {
        Category: "Civil Works",
        Amount:
          currency(
            estimate.costing.civilCost,
          ),
      },

      {
        Category: "Finishing",
        Amount:
          currency(
            estimate.costing.finishingCost,
          ),
      },

      {
        Category: "Electrical",
        Amount:
          currency(
            estimate.costing.electricalCost,
          ),
      },

      {
        Category: "Plumbing",
        Amount:
          currency(
            estimate.costing.plumbingCost,
          ),
      },

      {
        Category: "Interior",
        Amount:
          currency(
            estimate.costing.interiorCost,
          ),
      },
    ]);

  XLSX.utils.book_append_sheet(
    workbook,
    costingSheet,
    "Costing",
  );

  if (estimate.pwdItemization) {
    const pwdRows = [
      ...estimate.pwdItemization.civilItems,
      ...estimate.pwdItemization.plumbingItems,
      ...estimate.pwdItemization.electricalItems,
      ...estimate.pwdItemization.finishingItems,
    ].map((item) => ({
      Chapter:
        item.chapter,

      Code:
        item.itemCode,

      Description:
        item.description,

      Quantity:
        item.quantity,

      Unit:
        item.unit,

      Rate:
        currency(item.rate),

      Amount:
        currency(item.amount),
    }));

    const pwdSheet =
      XLSX.utils.json_to_sheet(
        pwdRows,
      );

    XLSX.utils.book_append_sheet(
      workbook,
      pwdSheet,
      "PWD BOQ",
    );
  }

  if (estimate.roomPlanning) {
    const planningSheet =
      XLSX.utils.json_to_sheet([
        {
          Bedrooms:
            estimate.roomPlanning
              .estimatedBedrooms,

          Bathrooms:
            estimate.roomPlanning
              .estimatedBathrooms,

          Kitchens:
            estimate.roomPlanning
              .estimatedKitchens,

          Parking:
            estimate.roomPlanning
              .estimatedParkingSlots,

          Efficiency:
            `${estimate.roomPlanning.efficiencyPercent}%`,
        },
      ]);

    XLSX.utils.book_append_sheet(
      workbook,
      planningSheet,
      "Planning",
    );
  }

  return workbook;
}
