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

function buildBriefing(args: {
  governance: any;
  cognition: any;
  learning: any;
  memoryEvolution: any;
}) {
  const governance =
    args.governance || {};

  const cognition =
    args.cognition?.cognition || {};

  const learning =
    args.learning?.learning || {};

  const memory =
    args.memoryEvolution?.evolution || {};

  const approvalRequired =
    governance?.summary
      ?.approvalRequired || 0;

  const predictiveRisk =
    cognition?.predictiveRisk ||
    "low";

  const fatigue =
    learning?.workflowFatigue || 0;

  const memoryState =
    memory?.memoryState ||
    "stable";

  let operationalState =
    "stable";

  if (
    predictiveRisk === "critical" ||
    approvalRequired >= 3
  ) {
    operationalState =
      "critical";
  } else if (
    predictiveRisk === "high" ||
    fatigue >= 70
  ) {
    operationalState =
      "watch";
  }

  let summary =
    "Procurement operations remain stable under supervised AI governance.";

  if (operationalState === "critical") {
    summary =
      "Critical procurement workflows require supervised operational review.";
  }

  if (operationalState === "watch") {
    summary =
      "Procurement operations show elevated recovery and fatigue pressure.";
  }

  const priorities = [];

  if (approvalRequired > 0) {
    priorities.push(
      `Review ${approvalRequired} governance approval queue item(s).`
    );
  }

  if (fatigue >= 70) {
    priorities.push(
      "Reduce procurement workflow fatigue and accelerate follow-up cadence."
    );
  }

  if (
    predictiveRisk === "critical"
  ) {
    priorities.push(
      "Review procurement escalation risk before operational deterioration."
    );
  }

  if (
    memoryState === "weak-learning"
  ) {
    priorities.push(
      "Monitor weakening supplier continuity behavior."
    );
  }

  if (priorities.length === 0) {
    priorities.push(
      "Continue supervised procurement monitoring."
    );
  }

  return {
    operationalState,
    summary,
    priorities,
    predictiveRisk,
    approvalRequired,
    fatigue,
    memoryState,
  };
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const [
      governance,
      cognition,
      learning,
      memoryEvolution,
    ] = await Promise.all([
      safeJson(
        `${origin}/api/ai/procurement-execution-governance`
      ),

      safeJson(
        `${origin}/api/ai/procurement-unified-cognition`
      ),

      safeJson(
        `${origin}/api/ai/procurement-outcome-learning`
      ),

      safeJson(
        `${origin}/api/ai/procurement-memory-evolution`
      ),
    ]);

    const briefing =
      buildBriefing({
        governance,
        cognition,
        learning,
        memoryEvolution,
      });

    return NextResponse.json({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      briefing,

      governanceMode:
        governance?.governanceMode ||
        "stable",

      executiveDirective:
        briefing.priorities[0],

      safety:
        "Copilot remains supervised and explainable.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,

        error:
          err?.message ||
          "Procurement copilot briefing failed.",
      },
      { status: 500 }
    );
  }
}
