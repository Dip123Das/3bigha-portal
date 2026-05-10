import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const [
      healthRes,
      executionRes,
      anomalyRes,
    ] = await Promise.all([
      fetch(
        `${origin}/api/ai/procurement-health-score`,
        { cache: "no-store" }
      ),
      fetch(
        `${origin}/api/ai/procurement-execution-engine`,
        { cache: "no-store" }
      ),
      fetch(
        `${origin}/api/ai/procurement-anomaly`,
        { cache: "no-store" }
      ),
    ]);

    const health = await healthRes.json();
    const execution = await executionRes.json();
    const anomaly = await anomalyRes.json();

    const summary = {
      healthScore: health?.healthScore || 0,
      healthStatus: health?.healthStatus || "Unknown",

      criticalThreads:
        health?.summary?.criticalThreads || 0,

      criticalSignals:
        health?.summary?.criticalSignals || 0,

      executionMode:
        execution?.priority || "normal",

      executiveDirective:
        execution?.executiveDirective ||
        "Maintain procurement monitoring.",

      anomalyCount:
        Array.isArray(anomaly?.alerts)
          ? anomaly.alerts.length
          : 0,
    };

    const priorities: string[] = [];

    if (summary.criticalThreads > 0) {
      priorities.push(
        "Resolve critical procurement workflows immediately."
      );
    }

    if (summary.anomalyCount > 0) {
      priorities.push(
        "Investigate operational procurement anomalies."
      );
    }

    if (summary.healthScore < 50) {
      priorities.push(
        "Increase procurement momentum and supplier engagement."
      );
    }

    if (priorities.length === 0) {
      priorities.push(
        "Procurement operations are stable today."
      );
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      briefing: summary,
      priorities,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Failed to generate daily procurement briefing.",
      },
      { status: 500 }
    );
  }
}