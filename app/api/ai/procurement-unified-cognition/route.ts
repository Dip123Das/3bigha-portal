import { NextResponse } from "next/server";
import { evaluateUnifiedProcurementCognition } from "@/lib/procurement/intelligence/unified-cognition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function safeJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return await res.json();
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const [
      telemetry,
      health,
      anomaly,
      crisis,
      execution,
      forecast,
      shortage,
      collapse,
      live,
    ] = await Promise.all([
      safeJson(`${origin}/api/ai/procurement-telemetry`),
      safeJson(`${origin}/api/ai/procurement-health-score`),
      safeJson(`${origin}/api/ai/procurement-anomaly`),
      safeJson(`${origin}/api/ai/procurement-crisis-center`),
      safeJson(`${origin}/api/ai/procurement-execution-engine`),
      safeJson(`${origin}/api/ai/procurement-forecast`),
      safeJson(`${origin}/api/ai/procurement-shortage-forecast`),
      safeJson(`${origin}/api/ai/procurement-supplier-collapse`),
      safeJson(`${origin}/api/ai/procurement-live-events`),
    ]);

    const telemetryData = telemetry?.telemetry || {};
    const forecastSummary = forecast?.summary || {};
    const anomalySummary = anomaly?.summary || {};
    const shortageRows = Array.isArray(shortage?.rows) ? shortage.rows : [];
    const collapseRows = Array.isArray(collapse?.suppliers) ? collapse.suppliers : [];

    const maxShortageRisk = shortageRows.reduce(
      (max: number, row: any) => Math.max(max, Number(row.shortageRisk || 0)),
      0
    );

    const maxCollapseRisk = collapseRows.reduce(
      (max: number, row: any) => Math.max(max, Number(row.collapseRisk || 0)),
      0
    );

    const cognition = evaluateUnifiedProcurementCognition({
      healthScore: Number(health?.healthScore || 0),
      operationalLoad: Number(telemetryData?.operationalLoad || 0),
      recoveryPressure: Number(telemetryData?.recoveryPressure || 0),
      criticalSignals: Number(live?.summary?.critical || 0),
      highSignals: Number(live?.summary?.high || 0),
      staleConversations: Number(telemetryData?.staleConversations || 0),
      avgClosureProbability: Number(forecastSummary?.avgProbability || 0),
      likelyClosures: Number(forecastSummary?.likelyClosures || 0),
      anomalyCount:
        Number(anomalySummary?.critical || 0) +
        Number(anomalySummary?.high || 0) +
        Number(anomalySummary?.medium || 0),
      supplierCollapseRisk: maxCollapseRisk,
      shortageRisk: maxShortageRisk,
    });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      cognition,
      synthesis: {
        healthScore: Number(health?.healthScore || 0),
        operationalLoad: Number(telemetryData?.operationalLoad || 0),
        recoveryPressure: Number(telemetryData?.recoveryPressure || 0),
        staleConversations: Number(telemetryData?.staleConversations || 0),
        anomalyCount:
          Number(anomalySummary?.critical || 0) +
          Number(anomalySummary?.high || 0) +
          Number(anomalySummary?.medium || 0),
        crisisLevel: crisis?.crisis?.level || "unknown",
        executionMode: execution?.executionMode || "unknown",
        likelyClosures: Number(forecastSummary?.likelyClosures || 0),
        supplierCollapseRisk: maxCollapseRisk,
        shortageRisk: maxShortageRisk,
      },
      executiveSummary:
        cognition.predictiveRisk === "critical"
          ? "Procurement cognition predicts critical operational deterioration."
          : cognition.predictiveRisk === "high"
            ? "Procurement cognition predicts elevated operational instability."
            : cognition.silentRiskDetected
              ? "Silent operational weakening detected before visible escalation."
              : cognition.recoveryLikely
                ? "Procurement workflows show recovery potential with guided intervention."
                : "Procurement cognition remains operationally stable.",
      nextBestAction: cognition.recommendedFocus,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unified procurement cognition failed.",
      },
      { status: 500 }
    );
  }
}
