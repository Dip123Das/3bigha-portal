// app/api/ai/procurement-inbox-actions/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actions = [
      {
        id: "1",
        thread: "Cement Procurement RFQ",
        urgency: "critical",
        aiAction:
          "Escalate vendor follow-up immediately",
        reason:
          "No supplier response for 72 hours.",
        confidence: 94,
      },
      {
        id: "2",
        thread: "Investment Property Discussion",
        urgency: "high",
        aiAction:
          "Send buyer re-engagement message",
        reason:
          "Conversation momentum dropping rapidly.",
        confidence: 81,
      },
      {
        id: "3",
        thread: "Electrical Material Procurement",
        urgency: "medium",
        aiAction:
          "Recommend alternate supplier options",
        reason:
          "Price competitiveness weakening.",
        confidence: 68,
      },
    ];

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      actions,
      executiveDirective:
        "AI inbox execution engine actively monitoring procurement workflows.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Inbox action intelligence failed.",
      },
      { status: 500 }
    );
  }
}