import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function detectIntent(q: string) {
  const s = q.toLowerCase();

  if (s.includes("urgent") || s.includes("attention") || s.includes("risk")) {
    return "risk";
  }

  if (s.includes("close") || s.includes("closure") || s.includes("deal")) {
    return "closure";
  }

  if (s.includes("vendor") || s.includes("supplier")) {
    return "supplier";
  }

  if (s.includes("forecast") || s.includes("next week")) {
    return "forecast";
  }

  return "summary";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const question = String(body?.question || "").trim();

    const intent = detectIntent(question);

    const base = process.env.NEXT_PUBLIC_SITE_URL || "";

    const [towerRes, forecastRes] = await Promise.all([
      fetch(`${base}/api/ai/procurement-control-tower`, { cache: "no-store" }),
      fetch(`${base}/api/ai/procurement-forecast`, { cache: "no-store" }),
    ]);

    const tower = await towerRes.json().catch(() => ({}));
    const forecast = await forecastRes.json().catch(() => ({}));

    const towerSummary = tower?.summary || {};
    const forecastSummary = forecast?.summary || {};
    const riskMap = Array.isArray(tower?.riskMap) ? tower.riskMap : [];
    const forecastRows = Array.isArray(forecast?.rows) ? forecast.rows : [];

    let answer = "";

    if (intent === "risk") {
      answer =
        towerSummary.critical > 0
          ? `${towerSummary.critical} critical procurement threads need immediate escalation. Start with the top risk-map items.`
          : towerSummary.high > 0
            ? `${towerSummary.high} high-risk threads need follow-up today.`
            : "No critical procurement risk found right now.";
    } else if (intent === "closure") {
      answer =
        forecastSummary.likelyClosures > 0
          ? `${forecastSummary.likelyClosures} conversations are likely to close based on current activity. Focus on high closure-probability threads first.`
          : "No strong closure candidates detected yet. Push follow-ups on active RFQs.";
    } else if (intent === "supplier") {
      const strong = forecastRows.filter((r: any) =>
        ["Excellent", "Good"].includes(String(r.supplierReliability))
      ).length;

      answer =
        strong > 0
          ? `${strong} supplier/conversation signals look reliable. Prioritize those before weak-response threads.`
          : "Supplier reliability looks weak or insufficient. Increase follow-up and compare more vendors.";
    } else if (intent === "forecast") {
      answer =
        forecast?.forecast?.nextWeekForecast ||
        "Next-week procurement forecast is currently unavailable.";
    } else {
      answer =
        tower?.insights?.executiveSummary ||
        forecast?.forecast?.executiveInsight ||
        "Procurement intelligence is active, but no major signal was found.";
    }

    return NextResponse.json({
      ok: true,
      question,
      intent,
      answer,
      recommendations: {
        nextBestAction:
          tower?.insights?.nextBestAction ||
          "Open the procurement inbox and handle the oldest high-risk thread.",
        forecast:
          forecast?.forecast?.nextWeekForecast ||
          "Forecast unavailable.",
      },
      topRiskItems: riskMap.slice(0, 5),
      topClosureItems: forecastRows.slice(0, 5),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Procurement copilot failed.",
      },
      { status: 500 }
    );
  }
}