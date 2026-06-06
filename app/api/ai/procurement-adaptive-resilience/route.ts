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
      executive,
      continuity,
      stabilization,
      cognition,
      telemetry,
    ] = await Promise.all([
      safeJson(`${origin}/api/ai/procurement-executive-synthesis`),
      safeJson(`${origin}/api/ai/procurement-executive-continuity`),
      safeJson(`${origin}/api/ai/procurement-self-stabilization`),
      safeJson(`${origin}/api/ai/procurement-unified-cognition`),
      safeJson(`${origin}/api/ai/procurement-telemetry`),
    ]);

    const executivePressure = Number(
      executive?.synthesis?.executivePressure || 0
    );

    const continuityPressure = Number(
      continuity?.continuity?.continuityPressure || 0
    );

    const stabilizationPressure = Number(
      stabilization?.stabilization?.stabilizationPressure || 0
    );

    const operationalDrift = Number(
      cognition?.cognition?.operationalDrift || 0
    );

    const operationalLoad = Number(
      telemetry?.telemetry?.operationalLoad || 0
    );

    const criticalConversations = Number(
      telemetry?.telemetry?.criticalConversations || 0
    );

    const adaptivePressure = clamp(
      executivePressure * 0.28 +
        continuityPressure * 0.24 +
        stabilizationPressure * 0.2 +
        operationalLoad * 0.16 +
        operationalDrift * 0.08 +
        criticalConversations * 5
    );

    const resilienceMode =
      adaptivePressure >= 80
        ? "resilience-focus"
        : adaptivePressure >= 55
          ? "guided-compression"
          : "normal-visibility";

    const signalDensity =
      adaptivePressure >= 80
        ? "critical-only"
        : adaptivePressure >= 55
          ? "priority-first"
          : "full-context";

    const focusMode =
      criticalConversations > 0 || adaptivePressure >= 80
        ? "mission-critical-workflows"
        : adaptivePressure >= 55
          ? "stabilization-and-recovery"
          : "balanced-operations";

    const guidance: any[] = [];

    if (adaptivePressure >= 80) {
      guidance.push({
        type: "critical-compression",
        title: "Compress executive view",
        recommendation:
          "Show mission-critical workflows first and reduce low-priority operational noise.",
        safety:
          "Critical signals remain visible. Compression is advisory and reversible.",
      });
    }

    if (continuityPressure >= 70) {
      guidance.push({
        type: "continuity-focus",
        title: "Prioritize continuity preservation",
        recommendation:
          "Elevate long-horizon continuity risks and reduce expansion-oriented operational distractions.",
        safety:
          "No restructuring occurs automatically.",
      });
    }

    if (stabilizationPressure >= 70) {
      guidance.push({
        type: "stabilization-routing",
        title: "Route attention to stabilization",
        recommendation:
          "Prioritize recovery-ready workflows, governance pressure and fatigue reduction actions.",
        safety:
          "AI only recommends focus routing.",
      });
    }

    if (operationalLoad >= 70) {
      guidance.push({
        type: "load-simplification",
        title: "Reduce operational density",
        recommendation:
          "Temporarily prioritize high-attention procurement items and collapse lower-value detail sections.",
        safety:
          "Operators can still expand full details manually.",
      });
    }

    if (guidance.length === 0) {
      guidance.push({
        type: "normal-visibility",
        title: "Maintain balanced visibility",
        recommendation:
          "Procurement operations can remain in normal visibility mode with full context available.",
        safety:
          "No adaptive compression required.",
      });
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      resilience: {
        adaptivePressure,
        resilienceMode,
        signalDensity,
        focusMode,
        executivePressure,
        continuityPressure,
        stabilizationPressure,
        operationalLoad,
        operationalDrift,
        criticalConversations,
      },
      guidance,
      executiveDirective: guidance[0]?.recommendation,
      safety:
        "Adaptive resilience is supervised and advisory-only. It does not hide critical workflows, execute procurement decisions, or change governance automatically.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Adaptive executive resilience failed.",
      },
      { status: 500 }
    );
  }
}
