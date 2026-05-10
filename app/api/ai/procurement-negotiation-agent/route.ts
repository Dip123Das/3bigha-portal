// app/api/ai/procurement-negotiation-agent/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const negotiations = [
      {
        id: "1",
        title: "Steel Procurement RFQ",
        leverage: "buyer",
        pressure: "high",
        closureProbability: 84,
        aiStrategy:
          "Push final supplier discount negotiation.",
        supplierRisk: "low",
      },
      {
        id: "2",
        title: "Commercial Land Acquisition",
        leverage: "balanced",
        pressure: "medium",
        closureProbability: 63,
        aiStrategy:
          "Delay negotiation to improve leverage.",
        supplierRisk: "medium",
      },
      {
        id: "3",
        title: "Electrical Vendor Contract",
        leverage: "supplier",
        pressure: "high",
        closureProbability: 41,
        aiStrategy:
          "Introduce alternate supplier competition.",
        supplierRisk: "high",
      },
    ];

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      negotiations,
      executiveDirective:
        "AI negotiation intelligence actively monitoring procurement leverage and closure probability.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Negotiation intelligence failed.",
      },
      { status: 500 }
    );
  }
}