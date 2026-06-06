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
      memoryEvolution,
      operatorIntelligence,
      dailyBriefing,
      situationFeed,
      executiveSynthesis,
    ] = await Promise.all([
      safeJson(
        `${origin}/api/ai/procurement-memory-evolution`
      ),

      safeJson(
        `${origin}/api/ai/procurement-operator-intelligence`
      ),

      safeJson(
        `${origin}/api/ai/procurement-daily-briefing`
      ),

      safeJson(
        `${origin}/api/ai/procurement-situation-feed`
      ),

      safeJson(
        `${origin}/api/ai/procurement-executive-synthesis`
      ),
    ]);

    const evolutionScore =
      Number(
        memoryEvolution?.evolution
          ?.evolutionScore || 0
      );

    const chronicFatigue =
      Boolean(
        memoryEvolution?.evolution
          ?.chronicFatigue
      );

    const operatorProfile =
      String(
        operatorIntelligence
          ?.operatorIntelligence
          ?.profile || "unknown"
      );

    const anomalyCount =
      Number(
        dailyBriefing?.briefing
          ?.anomalyCount || 0
      );

    const executivePressure =
      Number(
        executiveSynthesis
          ?.synthesis
          ?.executivePressure || 0
      );

    const criticalEvents =
      Array.isArray(
        situationFeed?.events
      )
        ? situationFeed.events.filter(
            (e: any) =>
              e.type === "critical"
          ).length
        : 0;

    const continuityPressure = clamp(
      (100 - evolutionScore) * 0.25 +
      executivePressure * 0.3 +
      anomalyCount * 8 +
      criticalEvents * 10 +
      (chronicFatigue ? 18 : 0)
    );

    const continuityMode =
      continuityPressure >= 80
        ? "continuity-intervention"
        : continuityPressure >= 55
          ? "continuity-watch"
          : "continuity-stable";

    const directives: any[] = [];

    if (chronicFatigue) {
      directives.push({
        type: "fatigue-rhythm-balancing",
        title:
          "Stabilize operational rhythm",
        directive:
          "Recurring fatigue patterns detected. Reduce repeated escalation loops and rebalance workflow pressure.",
        continuityImpact:
          "Improves long-term operator sustainability.",
      });
    }

    if (criticalEvents >= 2) {
      directives.push({
        type: "instability-reduction",
        title:
          "Reduce recurring operational instability",
        directive:
          "Repeated critical procurement events detected. Increase continuity monitoring and recovery supervision.",
        continuityImpact:
          "Reduces executive continuity degradation.",
      });
    }

    if (anomalyCount >= 3) {
      directives.push({
        type: "continuity-monitoring",
        title:
          "Increase continuity oversight",
        directive:
          "Operational anomaly clustering detected. Review structural procurement stability patterns.",
        continuityImpact:
          "Improves resilience continuity awareness.",
      });
    }

    if (
      operatorProfile ===
      "governance-focused"
    ) {
      directives.push({
        type: "governance-balancing",
        title:
          "Balance governance workload",
        directive:
          "Governance-heavy operational rhythm detected. Compress low-impact approval cycles where possible.",
        continuityImpact:
          "Improves executive operational continuity.",
      });
    }

    if (directives.length === 0) {
      directives.push({
        type: "continuity-stable",
        title:
          "Maintain executive continuity stability",
        directive:
          "Procurement ecosystem remains continuity-stable under supervised executive monitoring.",
        continuityImpact:
          "No structural continuity intervention required.",
      });
    }

    return NextResponse.json({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      continuity: {
        continuityPressure,
        continuityMode,

        evolutionScore,

        chronicFatigue,

        operatorProfile,

        anomalyCount,

        executivePressure,

        criticalEvents,
      },

      directives,

      executiveDirective:
        directives[0]?.directive,

      continuitySummary:
        directives
          .map((d: any) => d.title)
          .slice(0, 3)
          .join(" • "),

      safety:
        "Executive continuity intelligence remains supervised and advisory-only. AI does not autonomously restructure governance or procurement execution.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,

        error:
          err?.message ||
          "Executive continuity intelligence failed.",
      },
      { status: 500 }
    );
  }
}
