// app/api/ai/procurement-followup-agent/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = Date.now();

    const workflows = [
      {
        id: "rfq-1",
        title: "RFQ Conversation",
        module: "rfq",
        inactivityHours: 156,
        urgency: "critical",
        nextAction:
          "Send escalation follow-up to vendor",
        autoAction:
          "AI will send procurement reminder",
        recoveryScore: 18,
      },
      {
        id: "property-1",
        title:
          "Land / Plot (Residential) - Battala",
        module: "property_inquiry",
        inactivityHours: 88,
        urgency: "high",
        nextAction:
          "Recommend alternate supplier",
        autoAction:
          "AI supplier recovery campaign",
        recoveryScore: 42,
      },
      {
        id: "investment-1",
        title: "Investment Deal Room",
        module: "investment",
        inactivityHours: 44,
        urgency: "medium",
        nextAction:
          "Trigger buyer re-engagement",
        autoAction:
          "AI follow-up engagement",
        recoveryScore: 61,
      },
    ];

    const critical = workflows.filter(
      (x) => x.urgency === "critical"
    ).length;

    const high = workflows.filter(
      (x) => x.urgency === "high"
    ).length;

    const medium = workflows.filter(
      (x) => x.urgency === "medium"
    ).length;

    return NextResponse.json({
      ok: true,
      generatedAt: new Date(now).toISOString(),
      summary: {
        total: workflows.length,
        critical,
        high,
        medium,
      },
      workflows,
      executiveDirective:
        critical > 0
          ? "Immediate autonomous follow-up recovery required."
          : "Procurement workflows healthy.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Procurement follow-up agent failed.",
      },
      { status: 500 }
    );
  }
}