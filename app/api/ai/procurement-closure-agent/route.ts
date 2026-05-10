import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const closures = [
      {
        id: "1",
        workflow: "Steel Procurement RFQ",
        probability: 86,
        stage: "near-close",
        blocker: "Final discount confirmation pending",
        aiDirective: "Send final confirmation nudge.",
      },
      {
        id: "2",
        workflow: "Electrical Material RFQ",
        probability: 54,
        stage: "negotiation",
        blocker: "Supplier price uncertainty",
        aiDirective: "Introduce alternate supplier comparison.",
      },
      {
        id: "3",
        workflow: "Commercial Land Discussion",
        probability: 31,
        stage: "stalled",
        blocker: "Low buyer engagement",
        aiDirective: "Trigger recovery follow-up sequence.",
      },
    ];

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      closures,
      executiveDirective:
        "AI closure prediction agent is monitoring procurement conversion readiness.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Closure prediction failed.",
      },
      { status: 500 }
    );
  }
}