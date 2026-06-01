import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 60;

async function safeFetchJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return await res.json();
  } catch {
    return {};
  }
}

function scoreFromSignals(args: {
  critical: number;
  high: number;
  avgProbability: number;
  likelyClosures: number;
  total: number;
}) {
  const base = 72;
  const riskPenalty = args.critical * 12 + args.high * 6;
  const probabilityBoost = Math.round((args.avgProbability || 0) / 5);
  const closureBoost = Math.min(10, args.likelyClosures * 2);
  const volumePenalty = args.total === 0 ? 10 : 0;

  return Math.max(
    1,
    Math.min(100, base - riskPenalty + probabilityBoost + closureBoost - volumePenalty)
  );
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const [tower, forecast, anomaly, live] = await Promise.all([
      safeFetchJson(`${origin}/api/ai/procurement-control-tower`),
      safeFetchJson(`${origin}/api/ai/procurement-forecast`),
      safeFetchJson(`${origin}/api/ai/procurement-anomaly`),
      safeFetchJson(`${origin}/api/ai/procurement-live-events`),
    ]);

    const towerSummary = tower?.summary || {};
    const forecastSummary = forecast?.summary || {};
    const anomalySummary = anomaly?.summary || {};
    const liveSummary = live?.summary || {};

    const critical =
      Number(towerSummary.critical || 0) +
      Number(anomalySummary.critical || 0) +
      Number(liveSummary.critical || 0);

    const high =
      Number(towerSummary.high || 0) +
      Number(anomalySummary.high || 0) +
      Number(liveSummary.high || 0);

    const avgProbability = Number(forecastSummary.avgProbability || 0);
    const likelyClosures = Number(forecastSummary.likelyClosures || 0);
    const total = Number(towerSummary.total || forecastSummary.totalThreads || 0);

    const healthScore = scoreFromSignals({
      critical,
      high,
      avgProbability,
      likelyClosures,
      total,
    });

    const healthStatus =
      healthScore >= 80
        ? "Excellent"
        : healthScore >= 65
        ? "Healthy"
        : healthScore >= 45
        ? "Needs Attention"
        : "Critical";

    return NextResponse.json({
      ok: true,
      healthScore,
      healthStatus,
      summary: {
        total,
        criticalThreads: Number(towerSummary.critical || liveSummary.critical || 0),
        criticalSignals: critical,
        critical,
        high,
        avgProbability,
        likelyClosures,
        active: towerSummary.active || liveSummary.active || 0,
        closed: towerSummary.closed || 0,
      },
      executiveDiagnosis:
        healthScore >= 80
          ? "Procurement operations are strong with healthy conversion momentum."
          : healthScore >= 65
          ? "Procurement health is stable, but high-risk workflows should be followed up."
          : healthScore >= 45
          ? "Procurement pipeline needs active intervention to prevent delays and churn."
          : "Critical procurement risks require immediate escalation.",
      immediateAction:
        critical > 0
          ? "Escalate all critical workflows first."
          : high > 0
          ? "Follow up high-risk procurement conversations today."
          : likelyClosures > 0
          ? "Push likely-to-close conversations toward final confirmation."
          : "Open the inbox and create fresh procurement momentum.",
      weakPoints: [
        critical > 0 ? "Critical stale workflows detected" : null,
        high > 0 ? "High-risk follow-ups pending" : null,
        avgProbability < 45 ? "Low closure probability" : null,
        likelyClosures === 0 ? "No strong near-term closure candidates" : null,
      ].filter(Boolean),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Health score failed." },
      { status: 500 }
    );
  }
}
