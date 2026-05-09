import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildActions(args: {
  critical: number;
  high: number;
  healthScore: number;
  likelyClosures: number;
}) {
  const actions: any[] = [];

  if (args.critical > 0) {
    actions.push({
      priority: "critical",
      action: "Escalate stale procurement workflows",
      automation: "Send escalation reminders to procurement owners.",
      impact: "Prevents workflow collapse and RFQ abandonment.",
    });
  }

  if (args.high > 0) {
    actions.push({
      priority: "high",
      action: "Trigger AI procurement follow-ups",
      automation: "Generate AI nudges for inactive suppliers.",
      impact: "Improves procurement response rates.",
    });
  }

  if (args.likelyClosures > 0) {
    actions.push({
      priority: "high",
      action: "Push near-closure conversations",
      automation: "Suggest commercial confirmation workflows.",
      impact: "Accelerates procurement conversion.",
    });
  }

  if (args.healthScore < 45) {
    actions.push({
      priority: "critical",
      action: "Recover procurement momentum",
      automation: "Recommend new supplier outreach campaigns.",
      impact: "Improves procurement pipeline health.",
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: "normal",
      action: "Maintain procurement monitoring",
      automation: "Continue SLA and workflow monitoring.",
      impact: "Keeps procurement operations stable.",
    });
  }

  return actions;
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const healthRes = await fetch(
      `${origin}/api/ai/procurement-health-score`,
      {
        cache: "no-store",
      }
    );

    const health = await healthRes.json();

    const summary = health?.summary || {};

    const actions = buildActions({
      critical: Number(summary.criticalThreads || summary.critical || 0),
      high: Number(summary.high || 0),
      healthScore: Number(health?.healthScore || 0),
      likelyClosures: Number(summary.likelyClosures || 0),
    });

    return NextResponse.json({
      ok: true,
      executionLayer: "autonomous-procurement-actions",
      generatedAt: new Date().toISOString(),
      actions,
      executiveDirective:
        actions[0]?.action ||
        "Maintain procurement operations.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Execution actions failed.",
      },
      { status: 500 }
    );
  }
}