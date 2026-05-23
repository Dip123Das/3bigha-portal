export type HealingSeverity =
  | "stable"
  | "warning"
  | "critical";

export type HealingAction = {
  title: string;
  detail: string;
  severity: HealingSeverity;
};

export type SelfHealingResult = {
  health: HealingSeverity;
  summary: string;
  detectedIssues: string[];
  suggestedRecovery: HealingAction[];
};

function resolveSeverity(score: number): HealingSeverity {
  if (score >= 70) return "critical";
  if (score >= 35) return "warning";
  return "stable";
}

export function buildSelfHealing(input: {
  unread?: number;
  stale?: number;
  highRisk?: number;
  pendingQuotes?: number;
  activeThreads?: number;
}) : SelfHealingResult {
  const unread = input.unread || 0;
  const stale = input.stale || 0;
  const highRisk = input.highRisk || 0;
  const pendingQuotes = input.pendingQuotes || 0;
  const activeThreads = input.activeThreads || 0;

  const score =
    unread * 2 +
    stale * 6 +
    highRisk * 8 +
    pendingQuotes * 3 +
    Math.min(15, activeThreads);

  const health = resolveSeverity(score);

  const detectedIssues: string[] = [];
  const suggestedRecovery: HealingAction[] = [];

  if (highRisk > 0) {
    detectedIssues.push("High-risk workflow instability");

    suggestedRecovery.push({
      title: "Resolve critical operational risks",
      detail: "High-risk workflows should be stabilized before additional execution expansion.",
      severity: "critical",
    });
  }

  if (stale > 0) {
    detectedIssues.push("Delayed workflow stagnation");

    suggestedRecovery.push({
      title: "Restart delayed workflow chains",
      detail: "Reconnect inactive conversations and execution flows to restore momentum.",
      severity: "warning",
    });
  }

  if (pendingQuotes > 0) {
    detectedIssues.push("Quotation decision backlog");

    suggestedRecovery.push({
      title: "Reduce quotation approval delay",
      detail: "Pending quotation decisions are slowing operational throughput.",
      severity: "warning",
    });
  }

  if (unread > 0) {
    detectedIssues.push("Unread coordination queue");

    suggestedRecovery.push({
      title: "Clear unread communication queue",
      detail: "Unread operational communication may increase execution friction.",
      severity: "warning",
    });
  }

  if (!detectedIssues.length) {
    suggestedRecovery.push({
      title: "Operational flow stable",
      detail: "No major operational instability currently detected.",
      severity: "stable",
    });
  }

  const summary =
    health === "critical"
      ? "Operational instability detected. Recovery coordination recommended."
      : health === "warning"
      ? "Minor operational friction detected. Monitoring recommended."
      : "Operational coordination currently stable.";

  return {
    health,
    summary,
    detectedIssues,
    suggestedRecovery,
  };
}
