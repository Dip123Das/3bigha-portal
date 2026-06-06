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

function clamp(n: number) {
  return Math.max(1, Math.min(100, Math.round(n)));
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const [
      cognition,
      stabilization,
      strategic,
      mission,
      governance,
    ] = await Promise.all([
      safeJson(
        `${origin}/api/ai/procurement-unified-cognition`
      ),

      safeJson(
        `${origin}/api/ai/procurement-self-stabilization`
      ),

      safeJson(
        `${origin}/api/ai/procurement-strategic-orchestration`
      ),

      safeJson(
        `${origin}/api/ai/procurement-mission-control`
      ),

      safeJson(
        `${origin}/api/ai/procurement-execution-governance`
      ),
    ]);

    const cognitionScore =
      Number(
        cognition?.cognition
          ?.cognitionScore || 0
      );

    const predictiveRisk =
      String(
        cognition?.cognition
          ?.predictiveRisk || "low"
      );

    const stabilizationPressure =
      Number(
        stabilization?.stabilization
          ?.stabilizationPressure || 0
      );

    const strategicPressure =
      Number(
        strategic?.orchestration
          ?.orchestrationPressure || 0
      );

    const operationalLoad =
      Number(
        mission?.mission
          ?.operationalLoad || 0
      );

    const recoveryPressure =
      Number(
        mission?.mission
          ?.recoveryPressure || 0
      );

    const approvals =
      Number(
        governance?.summary
          ?.approvalRequired || 0
      );

    const executivePressure = clamp(
      stabilizationPressure * 0.25 +
      strategicPressure * 0.25 +
      operationalLoad * 0.2 +
      recoveryPressure * 0.2 +
      approvals * 6 +
      (100 - cognitionScore) * 0.1
    );

    const executiveMode =
      executivePressure >= 80
        ? "executive-intervention"
        : executivePressure >= 55
          ? "executive-watch"
          : "executive-stable";

    const directives: any[] = [];

    if (
      stabilizationPressure >= 70 &&
      approvals >= 2
    ) {
      directives.push({
        type: "governance-rebalancing",
        title:
          "Reduce governance congestion",
        directive:
          "Prioritize critical approvals and temporarily compress low-impact operational review queues.",
        executiveImpact:
          "Improves operational execution continuity.",
      });
    }

    if (
      strategicPressure >= 70
    ) {
      directives.push({
        type: "resilience-strengthening",
        title:
          "Strengthen procurement resilience",
        directive:
          "Increase supplier diversification focus and continuity preparedness for unstable procurement segments.",
        executiveImpact:
          "Reduces strategic procurement fragility.",
      });
    }

    if (
      recoveryPressure >= 70
    ) {
      directives.push({
        type: "recovery-stabilization",
        title:
          "Stabilize procurement recovery pressure",
        directive:
          "Prioritize recoverable workflows and reduce repeated low-value escalation cycles.",
        executiveImpact:
          "Improves operational recovery efficiency.",
      });
    }

    if (
      predictiveRisk === "critical"
    ) {
      directives.push({
        type: "executive-escalation",
        title:
          "Elevate executive procurement supervision",
        directive:
          "Critical predictive procurement pressure detected. Increase executive operational oversight.",
        executiveImpact:
          "Reduces escalation instability.",
      });
    }

    if (directives.length === 0) {
      directives.push({
        type: "executive-stability",
        title:
          "Maintain executive procurement stability",
        directive:
          "Procurement ecosystem remains operationally stable under supervised executive monitoring.",
        executiveImpact:
          "No executive intervention required.",
      });
    }

    return NextResponse.json({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      synthesis: {
        executivePressure,
        executiveMode,

        cognitionScore,

        predictiveRisk,

        stabilizationPressure,

        strategicPressure,

        operationalLoad,

        recoveryPressure,

        approvals,
      },

      directives,

      executiveDirective:
        directives[0]?.directive,

      executiveSummary:
        directives
          .map((d: any) => d.title)
          .slice(0, 3)
          .join(" • "),

      safety:
        "Executive synthesis remains supervised and advisory-only. AI does not autonomously approve, negotiate, replace suppliers or execute procurement decisions.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,

        error:
          err?.message ||
          "Executive synthesis failed.",
      },
      { status: 500 }
    );
  }
}
