import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type {
  ConstructionEstimateResponse,
} from "./cost-types";

function currency(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function generateConstructionPdf(
  estimate: ConstructionEstimateResponse,
) {
  const doc = new jsPDF();

  let y = 18;

  doc.setFontSize(20);
  doc.text(
    "3Bigha Construction DPR",
    14,
    y,
  );

  y += 10;

  doc.setFontSize(10);

  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    14,
    y,
  );

  y += 14;

  doc.setFontSize(15);

  doc.text(
    "Project Summary",
    14,
    y,
  );

  y += 8;

  autoTable(doc, {
    startY: y,

    head: [["Field", "Value"]],

    body: [
      [
        "Project Cost",
        currency(
          estimate.summary.estimatedBudget,
        ),
      ],

      [
        "Rate Per Sq.ft",
        currency(
          estimate.summary.estimatedRatePerSqFt,
        ),
      ],

      [
        "Project Area",
        `${estimate.request.builtUpAreaSqFt.toLocaleString("en-IN")} sq.ft`,
      ],

      [
        "Floors",
        String(
          estimate.request.floorCount ?? 1,
        ),
      ],

      [
        "Construction Grade",
        estimate.summary.suggestedGrade,
      ],
    ],
  });

  y =
    (doc as any).lastAutoTable.finalY + 14;

  doc.setFontSize(15);

  doc.text(
    "Costing Breakdown",
    14,
    y,
  );

  y += 8;

  autoTable(doc, {
    startY: y,

    head: [["Category", "Amount"]],

    body: [
      [
        "Civil Works",
        currency(
          estimate.costing.civilCost,
        ),
      ],

      [
        "Finishing",
        currency(
          estimate.costing.finishingCost,
        ),
      ],

      [
        "Electrical",
        currency(
          estimate.costing.electricalCost,
        ),
      ],

      [
        "Plumbing",
        currency(
          estimate.costing.plumbingCost,
        ),
      ],

      [
        "Interior",
        currency(
          estimate.costing.interiorCost,
        ),
      ],
    ],
  });

  y =
    (doc as any).lastAutoTable.finalY + 14;

  if (estimate.roomPlanning) {
    doc.setFontSize(15);

    doc.text(
      "Architectural Planning",
      14,
      y,
    );

    y += 8;

    autoTable(doc, {
      startY: y,

      head: [["Planning", "Value"]],

      body: [
        [
          "Bedrooms",
          estimate.roomPlanning
            .estimatedBedrooms,
        ],

        [
          "Bathrooms",
          estimate.roomPlanning
            .estimatedBathrooms,
        ],

        [
          "Parking Slots",
          estimate.roomPlanning
            .estimatedParkingSlots,
        ],

        [
          "Efficiency",
          `${estimate.roomPlanning.efficiencyPercent}%`,
        ],
      ],
    });

    y =
      (doc as any).lastAutoTable.finalY + 14;
  }

  if (estimate.pwdItemization) {
    doc.setFontSize(15);

    doc.text(
      "PWD Itemization",
      14,
      y,
    );

    y += 8;

    const rows = [
      ...estimate.pwdItemization.civilItems,
      ...estimate.pwdItemization.plumbingItems,
      ...estimate.pwdItemization.electricalItems,
      ...estimate.pwdItemization.finishingItems,
    ].map((item) => [
      item.itemCode,
      item.description,
      item.quantity,
      item.unit,
      currency(item.rate),
      currency(item.amount),
    ]);

    autoTable(doc, {
      startY: y,

      head: [[
        "Code",
        "Description",
        "Qty",
        "Unit",
        "Rate",
        "Amount",
      ]],

      body: rows,

      styles: {
        fontSize: 8,
      },

      columnStyles: {
        1: {
          cellWidth: 60,
        },
      },
    });

    y =
      (doc as any).lastAutoTable.finalY + 14;
  }

  if (estimate.dprReport) {
    doc.setFontSize(15);

    doc.text(
      "Recommendations",
      14,
      y,
    );

    y += 8;

    doc.setFontSize(10);

    estimate.dprReport.recommendations.forEach(
      (item) => {
        doc.text(
          `• ${item}`,
          16,
          y,
        );

        y += 6;
      },
    );
  }

  return doc;
}
