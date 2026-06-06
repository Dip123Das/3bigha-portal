import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function safeJson(url: string) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
    });

    return await res.json();
  } catch {
    return {};
  }
}

function buildAssistRecommendations(args: {
  cognition: any;
  autonomousTasks: any[];
  followups: any[];
  actions: any[];
}) {
  const recommendations: any[] = [];

  const cognition = args.cognition || {};

  if (cognition.silentRiskDetected) {
    recommendations.push({
      type: "silent-risk-recovery",
      priority: "high",
      title: "Review silently weakening procurement workflows",
      reason:
        "Operational cognition detected hidden workflow deterioration before visible escalation.",
      recommendation:
        "Trigger proactive supplier and buyer follow-up review.",
      automation:
        "AI recommends supervised recovery intervention.",
    });
  }

  if (cognition.escalationLikely) {
    recommendations.push({
      type: "escalation-prevention",
      priority: "critical",
      title: "Escalation pressure rising",
      reason:
        "Predictive cognition indicates procurement instability escalation risk.",
      recommendation:
        "Review critical workflows and reroute risky supplier chains.",
      automation:
        "AI recommends supervised escalation prevention.",
    });
  }

  if (cognition.recoveryLikely) {
    recommendations.push({
      type: "recovery-acceleration",
      priority: "medium",
      title: "Recovery opportunity detected",
      reason:
        "Procurement workflows show stabilization and closure potential.",
      recommendation:
        "Push recovering conversations toward commercial closure.",
      automation:
        "AI recommends closure acceleration nudges.",
    });
  }

  const criticalTasks =
    args.autonomousTasks.filter(
      (x) => x.priority === "critical"
    );

  if (criticalTasks.length > 0) {
    recommendations.push({
      type: "task-overload",
      priority: "critical",
      title: "Critical procurement tasks pending",
      reason:
        `${criticalTasks.length} critical procurement recovery workflow(s) require attention.`,
      recommendation:
        "Prioritize stale workflow recovery and escalation management.",
      automation:
        "AI recommends supervised execution queue review.",
    });
  }

  const followupCritical =
    args.followups.filter(
      (x) => x.urgency === "critical"
    );

  if (followupCritical.length > 0) {
    recommendations.push({
      type: "followup-recovery",
      priority: "high",
      title: "Critical follow-up recovery required",
      reason:
        "Inactive procurement workflows are approaching abandonment thresholds.",
      recommendation:
        "Launch proactive procurement recovery communication.",
      automation:
        "AI recommends supervised recovery nudges.",
    });
  }

  if (
    recommendations.length === 0
  ) {
    recommendations.push({
      type: "stable-operations",
      priority: "low",
      title: "Procurement operations stable",
      reason:
        "Operational cognition indicates balanced procurement continuity.",
      recommendation:
        "Continue procurement monitoring rhythm.",
      automation:
        "AI continues passive cognition monitoring.",
    });
  }

  return recommendations;
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const [
      cognitionData,
      autonomousTasks,
      followups,
      executionActions,
    ] = await Promise.all([
      safeJson(
        `${origin}/api/ai/procurement-unified-cognition`
      ),

      safeJson(
        `${origin}/api/ai/procurement-autonomous-tasks`
      ),

      safeJson(
        `${origin}/api/ai/procurement-followup-agent`
      ),

      safeJson(
        `${origin}/api/ai/procurement-execution-actions`
      ),
    ]);

    const cognition =
      cognitionData?.cognition || {};

    const tasks =
      Array.isArray(
        autonomousTasks?.tasks
      )
        ? autonomousTasks.tasks
        : [];

    const followupWorkflows =
      Array.isArray(
        followups?.workflows
      )
        ? followups.workflows
        : [];

    const actions =
      Array.isArray(
        executionActions?.actions
      )
        ? executionActions.actions
        : [];

    const recommendations =
      buildAssistRecommendations({
        cognition,
        autonomousTasks: tasks,
        followups: followupWorkflows,
        actions,
      });

    return NextResponse.json({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      cognition,

      summary: {
        recommendations:
          recommendations.length,

        critical:
          recommendations.filter(
            (x) =>
              x.priority ===
              "critical"
          ).length,

        high:
          recommendations.filter(
            (x) =>
              x.priority ===
              "high"
          ).length,
      },

      recommendations,

      executiveDirective:
        recommendations[0]
          ?.recommendation ||
        "Continue procurement monitoring.",

      orchestrationMode:
        "supervised-autonomous-assist",

      safety:
        "Human approval required before execution.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,

        error:
          err?.message ||
          "Autonomous assist synthesis failed.",
      },
      { status: 500 }
    );
  }
}
