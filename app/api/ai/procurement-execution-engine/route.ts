import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildExecutionPlan(args: {
  healthScore: number;
  critical: number;
  high: number;
  likelyClosures: number;
}) {
  const steps: string[] = [];

  if (args.critical > 0) {
    steps.push("Escalate critical procurement workflows immediately.");
  }

  if (args.high > 0) {
    steps.push("Send follow-up nudges to high-risk procurement conversations.");
  }

  if (args.likelyClosures > 0) {
    steps.push("Push likely-to-close RFQs toward commercial confirmation.");
  }

  if (args.healthScore < 45) {
    steps.push("Create fresh procurement momentum using supplier outreach.");
  }

  if (steps.length === 0) {
    steps.push("Monitor procurement workflows and maintain healthy response cadence.");
  }

  return steps;
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const healthRes = await fetch(
      `${origin}/api/ai/procurement-health-score`,
      { cache: "no-store" }
    );

    const health = await healthRes.json();

    const summary = health?.summary || {};

    const healthScore = Number(health?.healthScore || 0);

    const critical =
      Number(summary.criticalThreads || summary.critical || 0);

    const high = Number(summary.high || 0);

    const likelyClosures = Number(summary.likelyClosures || 0);

    const executionPlan = buildExecutionPlan({
      healthScore,
      critical,
      high,
      likelyClosures,
    });

    return NextResponse.json({
      ok: true,
      executionMode:
        healthScore >= 80
          ? "optimized"
          : healthScore >= 60
          ? "stable"
          : healthScore >= 40
          ? "recovery"
          : "critical-intervention",

      executionPriority:
        critical > 0
          ? "critical"
          : high > 0
          ? "high"
          : "normal",

      autonomousExecution: {
        procurementHealth: healthScore,
        immediateAction:
          health?.immediateAction ||
          "Review procurement workflows.",
        executionPlan,
      },

      aiReasoning:
        healthScore < 40
          ? "Procurement operations require active AI-guided recovery."
          : healthScore < 65
          ? "AI execution assistance recommended to maintain workflow momentum."
          : "Procurement workflows are stable with healthy execution momentum.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Execution engine failed.",
      },
      { status: 500 }
    );
  }
}