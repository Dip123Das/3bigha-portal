import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExecutionLog = {
  id: string;
  task: string;
  action: string;
  status: string;
  priority: string;
  time: string;
  mode?: string;
  confidence?: number;
};

function baseLogs(): ExecutionLog[] {
  return [
    {
      id: "log-1",
      task: "Escalate inactive RFQ conversation",
      action: "AI follow-up message generated",
      status: "ready",
      priority: "critical",
      mode: "approval-required",
      confidence: 94,
      time: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    },
    {
      id: "log-2",
      task: "Recover buyer engagement",
      action: "Buyer recovery message prepared",
      status: "ready",
      priority: "high",
      mode: "approval-required",
      confidence: 82,
      time: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    },
    {
      id: "log-3",
      task: "Recommend alternate supplier",
      action: "Supplier replacement recommendation created",
      status: "recommended",
      priority: "medium",
      mode: "recommended",
      confidence: 71,
      time: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  ];
}

export async function GET() {
  try {
    const logs = baseLogs();

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      logs,
      summary: {
        total: logs.length,
        ready: logs.filter((x) => x.status === "ready").length,
        critical: logs.filter((x) => x.priority === "critical").length,
        autoApproved: logs.filter((x) => x.mode === "auto-approved").length,
      },
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const log: ExecutionLog = {
      id: `log-${Date.now()}`,
      task: String(body?.task || "Autonomous procurement task"),
      action: String(body?.action || "AI procurement action generated"),
      status: String(body?.status || "generated"),
      priority: String(body?.priority || "medium"),
      mode: String(body?.mode || "approval-required"),
      confidence: Number(body?.confidence || 70),
      time: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      saved: true,
      log,
      message:
        "Execution log accepted. Persistent database storage can be enabled in the next phase.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to create execution log.",
      },
      { status: 500 }
    );
  }
}