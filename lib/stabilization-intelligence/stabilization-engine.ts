export type StabilizationState =
  | "stable"
  | "watch"
  | "stabilize"
  | "critical";

export type StabilizationStep = {
  title: string;
  detail: string;
  state: StabilizationState;
};

export type StabilizationResult = {
  state: StabilizationState;
  summary: string;
  riskPatterns: string[];
  stabilizationSteps: StabilizationStep[];
};

function resolveState(score: number): StabilizationState {
  if (score >= 80) return "critical";
  if (score >= 50) return "stabilize";
  if (score >= 25) return "watch";
  return "stable";
}

export function buildStabilizationPlan(input: {
  unread?: number;
  stale?: number;
  highRisk?: number;
  pendingQuotes?: number;
  activeThreads?: number;
}): StabilizationResult {
  const unread = input.unread || 0;
  const stale = input.stale || 0;
  const highRisk = input.highRisk || 0;
  const pendingQuotes = input.pendingQuotes || 0;
  const activeThreads = input.activeThreads || 0;

  const score =
    unread * 2 +
    stale * 7 +
    highRisk * 10 +
    pendingQuotes * 3 +
    Math.min(20, activeThreads);

  const state = resolveState(score);
  const riskPatterns: string[] = [];
  const stabilizationSteps: StabilizationStep[] = [];

  if (highRisk > 0) {
    riskPatterns.push("Critical risk concentration");
    stabilizationSteps.push({
      title: "Stabilize high-risk workflow concentration",
      detail: "Prioritize critical workflows before starting new execution activity.",
      state: "critical",
    });
  }

  if (stale > 0) {
    riskPatterns.push("Stale workflow accumulation");
    stabilizationSteps.push({
      title: "Break stale workflow accumulation",
      detail: "Restart delayed chains through follow-up, rerouting or closure.",
      state: "stabilize",
    });
  }

  if (pendingQuotes > 0) {
    riskPatterns.push("Decision backlog pressure");
    stabilizationSteps.push({
      title: "Reduce decision backlog pressure",
      detail: "Close quotation decisions to prevent procurement congestion.",
      state: "watch",
    });
  }

  if (unread > 0) {
    riskPatterns.push("Unread coordination pressure");
    stabilizationSteps.push({
      title: "Reduce unread coordination pressure",
      detail: "Clear unread messages before they become execution blockers.",
      state: "watch",
    });
  }

  if (!stabilizationSteps.length) {
    stabilizationSteps.push({
      title: "Operational system stable",
      detail: "No major instability pattern detected now.",
      state: "stable",
    });
  }

  const summary =
    state === "critical"
      ? "Critical instability pattern detected. Stabilization should be prioritized."
      : state === "stabilize"
      ? "Operational instability is forming. Stabilization is recommended."
      : state === "watch"
      ? "Early instability signals detected. Watch and manage calmly."
      : "Operational system currently stable.";

  return {
    state,
    summary,
    riskPatterns,
    stabilizationSteps,
  };
}
