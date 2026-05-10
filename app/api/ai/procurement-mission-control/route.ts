import { NextResponse } from "next/server";

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

    const [health, crisis, briefing, execution, live] = await Promise.all([
      safeJson(`${origin}/api/ai/procurement-health-score`),
      safeJson(`${origin}/api/ai/procurement-crisis-center`),
      safeJson(`${origin}/api/ai/procurement-daily-briefing`),
      safeJson(`${origin}/api/ai/procurement-execution-engine`),
      safeJson(`${origin}/api/ai/procurement-live-events`),
    ]);

    const healthScore = Number(health?.healthScore || 0);
    const crisisLevel = crisis?.crisis?.level || "unknown";
    const criticalThreads = Number(
      health?.summary?.criticalThreads ||
        crisis?.crisis?.criticalThreads ||
        0
    );
    const criticalSignals = Number(
      health?.summary?.criticalSignals ||
        crisis?.crisis?.criticalSignals ||
        0
    );

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      mission: {
        healthScore,
        healthStatus: health?.healthStatus || "Unknown",
        crisisLevel,
        operationalThreat: crisis?.crisis?.operationalThreat || 0,
        executionMode: execution?.executionMode || "unknown",
        executionPriority: execution?.executionPriority || "normal",
        criticalThreads,
        criticalSignals,
        liveEvents: live?.summary?.total || 0,
      },
      executiveSummary:
        criticalThreads > 0
          ? "Procurement operations need immediate executive attention."
          : healthScore >= 70
            ? "Procurement operations are stable and actively monitored."
            : "Procurement operations require continued AI-guided follow-up.",
      topPriorities: Array.isArray(briefing?.priorities)
        ? briefing.priorities
        : [],
      emergencyDirectives: Array.isArray(crisis?.directives)
        ? crisis.directives
        : [],
      nextBestAction:
        execution?.autonomousExecution?.immediateAction ||
        health?.immediateAction ||
        "Open procurement inbox and review active workflows.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Mission control failed.",
      },
      { status: 500 }
    );
  }
}