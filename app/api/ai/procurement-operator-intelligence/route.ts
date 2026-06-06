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

function classifyOperator(args: {
  approvalRequired: number;
  fatigue: number;
  predictiveRisk: string;
  recoveryPressure: number;
}) {
  const {
    approvalRequired,
    fatigue,
    predictiveRisk,
    recoveryPressure,
  } = args;

  if (
    approvalRequired >= 3 ||
    predictiveRisk === "critical"
  ) {
    return {
      profile: "governance-focused",
      operationalStyle:
        "Strict operational review and escalation governance.",
      copilotMode:
        "high-governance-assist",
    };
  }

  if (
    recoveryPressure >= 70 ||
    fatigue >= 70
  ) {
    return {
      profile: "recovery-focused",
      operationalStyle:
        "Recovery stabilization and workflow continuity prioritization.",
      copilotMode:
        "stabilization-assist",
    };
  }

  if (
    predictiveRisk === "high"
  ) {
    return {
      profile: "monitoring-focused",
      operationalStyle:
        "Continuous operational monitoring and proactive oversight.",
      copilotMode:
        "watchtower-assist",
    };
  }

  return {
    profile: "execution-focused",
    operationalStyle:
      "Fast operational execution and workflow progression.",
    copilotMode:
      "execution-assist",
  };
}

export async function GET(req: Request) {
  try {
    const origin =
      new URL(req.url).origin;

    const [
      copilotBriefing,
      governance,
      missionControl,
    ] = await Promise.all([
      safeJson(
        `${origin}/api/ai/procurement-copilot-briefing`
      ),

      safeJson(
        `${origin}/api/ai/procurement-execution-governance`
      ),

      safeJson(
        `${origin}/api/ai/procurement-mission-control`
      ),
    ]);

    const approvalRequired =
      Number(
        governance?.summary
          ?.approvalRequired || 0
      );

    const fatigue =
      Number(
        copilotBriefing?.briefing
          ?.fatigue || 0
      );

    const predictiveRisk =
      String(
        copilotBriefing?.briefing
          ?.predictiveRisk || "low"
      );

    const recoveryPressure =
      Number(
        missionControl?.mission
          ?.recoveryPressure || 0
      );

    const profile =
      classifyOperator({
        approvalRequired,
        fatigue,
        predictiveRisk,
        recoveryPressure,
      });

    return NextResponse.json({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      operatorIntelligence: {
        ...profile,

        approvalRequired,

        fatigue,

        predictiveRisk,

        recoveryPressure,

        explainability: [
          approvalRequired > 0
            ? "Operator currently managing governance approvals."
            : null,

          fatigue >= 70
            ? "Operational fatigue pressure detected."
            : null,

          predictiveRisk === "critical"
            ? "Critical predictive procurement pressure detected."
            : null,

          recoveryPressure >= 70
            ? "Recovery stabilization pressure elevated."
            : null,
        ].filter(Boolean),
      },

      safety:
        "Operator intelligence remains supervised, explainable and advisory-only.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,

        error:
          err?.message ||
          "Operator intelligence failed.",
      },
      { status: 500 }
    );
  }
}
