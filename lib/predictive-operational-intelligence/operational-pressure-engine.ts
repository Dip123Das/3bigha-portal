import type { PredictiveSeverity, WorkflowPredictionInput } from "./predictive-types";

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function severityFromScore(score: number): PredictiveSeverity {
  if (score >= 75) return "risk";
  if (score >= 55) return "pressure";
  if (score >= 30) return "watch";
  return "calm";
}

export function calculateOperationalPressure(input: WorkflowPredictionInput) {
  const score = clampScore(
    (input.openWorkflows || 0) * 4 +
      (input.staleWorkflows || 0) * 12 +
      (input.pendingReplies || 0) * 8 +
      (input.overdueTasks || 0) * 14 +
      (input.executionBlockedItems || 0) * 16 +
      (input.recentFailures || 0) * 18
  );

  return {
    score,
    severity: severityFromScore(score),
  };
}
