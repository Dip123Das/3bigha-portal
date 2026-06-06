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
      reliability,
      shortage,
      collapse,
      forecast,
    ] = await Promise.all([
      safeJson(
        `${origin}/api/ai/procurement-supplier-reliability`
      ),

      safeJson(
        `${origin}/api/ai/procurement-shortage-forecast`
      ),

      safeJson(
        `${origin}/api/ai/procurement-supplier-collapse`
      ),

      safeJson(
        `${origin}/api/ai/procurement-forecast`
      ),
    ]);

    const suppliers =
      Array.isArray(reliability?.suppliers)
        ? reliability.suppliers
        : [];

    const shortageRows =
      Array.isArray(shortage?.rows)
        ? shortage.rows
        : [];

    const collapseRows =
      Array.isArray(collapse?.suppliers)
        ? collapse.suppliers
        : [];

    const forecastSummary =
      forecast?.summary || {};

    const weakSuppliers =
      suppliers.filter(
        (s: any) =>
          Number(s.reliability || 0) < 60
      ).length;

    const criticalShortages =
      Number(shortage?.summary?.critical || 0);

    const highShortages =
      Number(shortage?.summary?.high || 0);

    const collapseThreats =
      collapseRows.filter(
        (s: any) =>
          s.risk === "Critical" ||
          s.risk === "High"
      ).length;

    const forecastRisk =
      Number(
        forecastSummary?.highRisk || 0
      );

    const orchestrationPressure =
      clamp(
        weakSuppliers * 10 +
          criticalShortages * 15 +
          highShortages * 8 +
          collapseThreats * 12 +
          forecastRisk * 4
      );

    const orchestrationMode =
      orchestrationPressure >= 80
        ? "strategic-intervention"
        : orchestrationPressure >= 55
          ? "strategic-watch"
          : "strategic-stable";

    const directives: any[] = [];

    if (weakSuppliers >= 1) {
      directives.push({
        type: "supplier-diversification",
        title:
          "Reduce supplier dependency concentration",
        recommendation:
          "Increase alternate supplier onboarding for weak reliability segments.",
        strategicImpact:
          "Improves procurement resilience.",
      });
    }

    if (
      criticalShortages > 0 ||
      highShortages > 1
    ) {
      directives.push({
        type: "supply-continuity",
        title:
          "Strengthen supply continuity planning",
        recommendation:
          "Increase monitoring for high-stress procurement categories and affected zones.",
        strategicImpact:
          "Reduces shortage escalation risk.",
      });
    }

    if (collapseThreats > 0) {
      directives.push({
        type: "collapse-prevention",
        title:
          "Prepare supplier continuity safeguards",
        recommendation:
          "Review emergency rerouting readiness for unstable suppliers.",
        strategicImpact:
          "Improves procurement continuity resilience.",
      });
    }

    if (forecastRisk >= 5) {
      directives.push({
        type: "pipeline-rebalancing",
        title:
          "Rebalance procurement pipeline attention",
        recommendation:
          "Prioritize high-churn procurement workflows requiring immediate follow-up.",
        strategicImpact:
          "Improves procurement conversion stability.",
      });
    }

    if (directives.length === 0) {
      directives.push({
        type: "strategic-stability",
        title:
          "Maintain strategic procurement stability",
        recommendation:
          "Current procurement ecosystem remains strategically stable under supervised monitoring.",
        strategicImpact:
          "No strategic intervention required.",
      });
    }

    return NextResponse.json({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      orchestration: {
        orchestrationPressure,
        orchestrationMode,

        weakSuppliers,

        criticalShortages,

        highShortages,

        collapseThreats,

        forecastRisk,
      },

      directives,

      executiveDirective:
        directives[0]?.recommendation,

      safety:
        "Strategic orchestration is advisory-only and does not autonomously replace suppliers, approve procurement, or execute commercial decisions.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,

        error:
          err?.message ||
          "Strategic orchestration failed.",
      },
      { status: 500 }
    );
  }
}
