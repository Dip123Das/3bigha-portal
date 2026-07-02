import type {
  AmeDecision,
  AmeDecisionPriority,
  AmeRecommendedAction,
  AmeSignal,
} from "./types";

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolvePriority(score: number, confidence: number): AmeDecisionPriority {
  if (score >= 85 && confidence >= 75) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function resolveAction(signals: AmeSignal[]): AmeRecommendedAction {
  const sources = new Set(signals.map((signal) => signal.source));

  if (sources.has("gap") && sources.has("demand")) return "recruit_vendor";
  if (sources.has("rfq") || sources.has("procurement")) return "generate_opportunity";
  if (sources.has("vendor") && sources.has("mos")) return "notify_vendor";
  if (sources.has("growth") && sources.has("geography")) return "promote_location";

  return "monitor_only";
}

export function makeAmeDecision(signals: AmeSignal[]): AmeDecision {
  const usableSignals = signals.filter(Boolean);

  const avgScore =
    usableSignals.length > 0
      ? usableSignals.reduce((sum, signal) => sum + (signal.score ?? 50), 0) /
        usableSignals.length
      : 0;

  const avgConfidence =
    usableSignals.length > 0
      ? usableSignals.reduce(
          (sum, signal) => sum + (signal.confidence ?? 60),
          0,
        ) / usableSignals.length
      : 0;

  const confidence = clampConfidence(avgConfidence);
  const priority = resolvePriority(avgScore, confidence);
  const action = resolveAction(usableSignals);

  const primarySignal = usableSignals[0];

  return {
    decision_id: crypto.randomUUID(),
    priority,
    action,
    title: primarySignal?.title || "Marketplace executive observation",
    reasoning:
      usableSignals.length > 0
        ? `AME reviewed ${usableSignals.length} marketplace signal(s) and selected ${action} with ${priority} priority.`
        : "AME found no actionable marketplace signals. Monitoring only.",
    confidence,
    estimated_value: null,
    signals: usableSignals,
    created_at: new Date().toISOString(),
  };
}
