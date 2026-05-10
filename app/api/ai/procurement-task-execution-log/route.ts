import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = [
      {
        id: "log-1",
        task: "Escalate inactive RFQ conversation",
        action: "AI follow-up message generated",
        status: "ready",
        priority: "critical",
        time: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      },
      {
        id: "log-2",
        task: "Recover buyer engagement",
        action: "Buyer recovery message prepared",
        status: "ready",
        priority: "high",
        time: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
      },
      {
        id: "log-3",
        task: "Recommend alternate supplier",
        action: "Supplier replacement recommendation created",
        status: "recommended",
        priority: "medium",
        time: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
    ];

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      logs,
      executiveDirective:
        "AI procurement task execution log is tracking autonomous workflow actions.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Task execution log failed.",
      },
      { status: 500 }
    );
  }
}