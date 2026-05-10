// app/api/ai/procurement-supplier-reliability/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const suppliers = [
      {
        id: "1",
        supplier: "North Bengal Cement Supply",
        reliability: 92,
        deliveryConsistency: 89,
        negotiationStability: 94,
        operationalRisk: "low",
        aiDirective:
          "Preferred supplier for high-priority procurement.",
      },
      {
        id: "2",
        supplier: "Eastern Steel Logistics",
        reliability: 67,
        deliveryConsistency: 61,
        negotiationStability: 72,
        operationalRisk: "medium",
        aiDirective:
          "Monitor delivery timelines carefully.",
      },
      {
        id: "3",
        supplier: "Rapid Electrical Vendors",
        reliability: 41,
        deliveryConsistency: 38,
        negotiationStability: 49,
        operationalRisk: "high",
        aiDirective:
          "Recommend alternate supplier activation.",
      },
    ];

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      suppliers,
      executiveDirective:
        "AI supplier reliability engine actively monitoring procurement continuity risks.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Supplier reliability intelligence failed.",
      },
      { status: 500 }
    );
  }
}