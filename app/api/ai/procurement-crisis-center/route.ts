import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function crisisLevel(score: number) {
  if (score >= 80) {
    return "stable";
  }

  if (score >= 55) {
    return "elevated";
  }

  if (score >= 35) {
    return "high-risk";
  }

  return "critical";
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const res = await fetch(
      `${origin}/api/ai/procurement-health-score`,
      {
        cache: "no-store",
      }
    );

    const health = await res.json();

    const healthScore =
      Number(health?.healthScore || 0);

    const level = crisisLevel(healthScore);

    const directives: string[] = [];

    if (level === "critical") {
      directives.push(
        "Immediate procurement escalation required."
      );

      directives.push(
        "Activate autonomous workflow recovery."
      );

      directives.push(
        "Increase supplier engagement frequency."
      );
    }

    if (level === "high-risk") {
      directives.push(
        "Monitor procurement workflows continuously."
      );

      directives.push(
        "Prioritize critical RFQ execution."
      );
    }

    if (level === "elevated") {
      directives.push(
        "Maintain operational procurement monitoring."
      );
    }

    if (level === "stable") {
      directives.push(
        "Procurement systems operating normally."
      );
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),

      crisis: {
        level,
        healthScore,
        operationalThreat:
          Math.max(0, 100 - healthScore),

        criticalThreads:
          health?.summary?.criticalThreads || 0,

        criticalSignals:
          health?.summary?.criticalSignals || 0,
      },

      directives,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Failed to generate procurement crisis center.",
      },
      { status: 500 }
    );
  }
}