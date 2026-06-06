import { NextResponse } from "next/server";
import { evaluateProcurementMemoryProfile } from "@/lib/procurement/intelligence/memory/procurement-memory-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function safeJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return await res.json();
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const [briefing, governance, memoryEvolution] = await Promise.all([
      safeJson(`${origin}/api/ai/procurement-copilot-briefing`),
      safeJson(`${origin}/api/ai/procurement-execution-governance`),
      safeJson(`${origin}/api/ai/procurement-memory-evolution`),
    ]);

    const approvalRequired = Number(
      governance?.summary?.approvalRequired || 0
    );

    const memory = memoryEvolution?.evolution || {};

    const profile = evaluateProcurementMemoryProfile({
      entityId: "procurement-copilot-operator",
      entityType: "workflow",
      totalInteractions: 6,
      successfulResponses:
        briefing?.briefing?.operationalState === "stable" ? 4 : 2,
      delayedResponses:
        briefing?.briefing?.operationalState === "watch" ? 2 : 0,
      missedResponses:
        briefing?.briefing?.operationalState === "critical" ? 1 : 0,
      completedWorkflows:
        memory?.memoryState === "healthy-learning" ? 3 : 1,
      stalledWorkflows:
        memory?.chronicFatigue ? 2 : 0,
      recoveredWorkflows:
        memory?.trustDirection === "improving" ? 2 : 1,
      deliveryDelayCount:
        memory?.trustDirection === "weakening" ? 1 : 0,
    });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      copilotMemory: {
        profile,
        operatorStyle:
          approvalRequired > 0
            ? "governance-focused"
            : "monitoring-focused",
        preferredMode:
          profile.reliability === "reliable"
            ? "light-touch guidance"
            : profile.reliability === "watch"
              ? "supervised guidance"
              : "high-review guidance",
        nextPersonalization:
          approvalRequired > 0
            ? "Prioritize approval queue and execution safety reminders."
            : "Prioritize calm operational summaries and next-best actions.",
      },
      safety:
        "Copilot memory is advisory only. No hidden automation or commercial execution.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Procurement copilot memory failed.",
      },
      { status: 500 }
    );
  }
}
