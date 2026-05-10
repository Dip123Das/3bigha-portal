import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tasks = [
      {
        id: "task-1",
        title: "Escalate inactive RFQ conversation",
        workflow: "RFQ Conversation",
        type: "follow_up",
        priority: "critical",
        target: "vendor",
        suggestedMessage:
          "Hello, this procurement request is still pending. Please share your final price, delivery timeline, and availability today.",
        reason: "No vendor response detected within SLA window.",
        confidence: 94,
        status: "ready",
      },
      {
        id: "task-2",
        title: "Recover buyer engagement",
        workflow: "Investment Deal Room",
        type: "buyer_recovery",
        priority: "high",
        target: "buyer",
        suggestedMessage:
          "Hello, we noticed this discussion is pending. Would you like us to help compare options or continue the negotiation?",
        reason: "Buyer activity has reduced after procurement discussion.",
        confidence: 82,
        status: "ready",
      },
      {
        id: "task-3",
        title: "Recommend alternate supplier",
        workflow: "Electrical Material Procurement",
        type: "supplier_replacement",
        priority: "medium",
        target: "system",
        suggestedMessage:
          "AI recommends activating alternate supplier options to improve procurement recovery probability.",
        reason: "Supplier reliability and closure probability are weakening.",
        confidence: 71,
        status: "recommended",
      },
    ];

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      tasks,
      summary: {
        total: tasks.length,
        critical: tasks.filter((x) => x.priority === "critical").length,
        high: tasks.filter((x) => x.priority === "high").length,
        ready: tasks.filter((x) => x.status === "ready").length,
      },
      executiveDirective:
        "Autonomous procurement task engine has generated executable recovery actions.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Autonomous procurement tasks failed.",
      },
      { status: 500 }
    );
  }
}