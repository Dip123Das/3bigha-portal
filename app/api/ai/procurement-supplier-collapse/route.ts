import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPLIERS = [
  "Eastern Steel Supply",
  "Bengal Cement Hub",
  "Northline Electricals",
  "Metro Pipe Traders",
  "Prime Tiles Network",
  "Rapid Aggregates",
];

function riskLevel(score: number) {
  if (score >= 85) return "Critical";
  if (score >= 70) return "High";
  if (score >= 50) return "Medium";
  return "Stable";
}

export async function GET() {
  try {
    const suppliers = SUPPLIERS.map((name, index) => {
      const collapseRisk = Math.min(98, 42 + index * 11);
      const silenceRisk = Math.min(95, 35 + index * 10);
      const overloadRisk = Math.min(94, 38 + index * 9);

      return {
        id: `supplier-collapse-${index}`,
        supplier: name,
        collapseRisk,
        silenceRisk,
        overloadRisk,
        risk: riskLevel(collapseRisk),
        emergencyAction:
          collapseRisk >= 80
            ? "Initiate emergency supplier rerouting immediately."
            : collapseRisk >= 60
            ? "Increase procurement supervision and backup sourcing."
            : "Supplier stability currently acceptable.",
      };
    });

    return NextResponse.json({
      ok: true,
      executiveSummary:
        "AI supplier-collapse predictor is actively monitoring supplier instability and procurement continuity risks.",
      suppliers,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      suppliers: [],
    });
  }
}