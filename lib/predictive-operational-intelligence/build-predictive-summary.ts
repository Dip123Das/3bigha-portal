import type {
  PredictiveOperationalSummary,
  PredictiveSignal,
  WorkflowPredictionInput,
} from "./predictive-types";
import { calculateOperationalPressure, severityFromScore } from "./operational-pressure-engine";

export function buildPredictiveOperationalSummary(
  input: WorkflowPredictionInput = {}
): PredictiveOperationalSummary {
  const pressure = calculateOperationalPressure(input);
  const signals: PredictiveSignal[] = [];

  if ((input.staleWorkflows || 0) > 0) {
    signals.push({
      id: "stale-workflows",
      title: "Workflow follow-up needed",
      message: `${input.staleWorkflows} workflow may slow down without timely coordination.`,
      severity: "watch",
      score: Math.min(100, (input.staleWorkflows || 0) * 18),
      actionLabel: "Review workflows",
      href: "/dashboard/inbox-v2",
    });
  }

  if ((input.pendingReplies || 0) > 0) {
    signals.push({
      id: "pending-replies",
      title: "Reply pressure increasing",
      message: `${input.pendingReplies} conversation may need a response soon.`,
      severity: "pressure",
      score: Math.min(100, (input.pendingReplies || 0) * 14),
      actionLabel: "Open inbox",
      href: "/dashboard/inbox-v2",
    });
  }

  if ((input.supplierSilenceHours || 0) >= 12) {
    signals.push({
      id: "supplier-response-risk",
      title: "Supplier response may slow",
      message: "One or more supplier chains may need a gentle follow-up.",
      severity: "watch",
      score: Math.min(100, (input.supplierSilenceHours || 0) * 3),
      actionLabel: "Check procurement",
      href: "/dashboard/procurement-health",
    });
  }

  if ((input.executionBlockedItems || 0) > 0) {
    signals.push({
      id: "execution-blocked",
      title: "Execution coordination needed",
      message: `${input.executionBlockedItems} execution item may be blocked by dependency or delay.`,
      severity: "pressure",
      score: Math.min(100, (input.executionBlockedItems || 0) * 22),
      actionLabel: "Review execution",
      href: "/dashboard/procurement-execution",
    });
  }

  const highestSignalScore = signals.reduce((max, signal) => Math.max(max, signal.score), 0);
  const overallScore = Math.max(pressure.score, highestSignalScore);

  return {
    overallSeverity: severityFromScore(overallScore),
    overallScore,
    signals,
    updatedAt: new Date().toISOString(),
  };
}
