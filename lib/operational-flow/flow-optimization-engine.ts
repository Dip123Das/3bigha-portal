export type FlowHealth = "smooth" | "friction" | "congested" | "blocked";

export type FlowOptimizationItem = {
  title: string;
  detail: string;
  impact: "low" | "medium" | "high";
};

export type OperationalFlowResult = {
  health: FlowHealth;
  summary: string;
  optimizationItems: FlowOptimizationItem[];
};

export function buildOperationalFlow(input: {
  unread?: number;
  stale?: number;
  highRisk?: number;
  pendingQuotes?: number;
  activeThreads?: number;
}): OperationalFlowResult {
  const unread = input.unread || 0;
  const stale = input.stale || 0;
  const highRisk = input.highRisk || 0;
  const pendingQuotes = input.pendingQuotes || 0;
  const activeThreads = input.activeThreads || 0;

  const pressure =
    unread * 2 +
    stale * 5 +
    highRisk * 8 +
    pendingQuotes * 3 +
    Math.min(20, activeThreads);

  const health: FlowHealth =
    highRisk > 0
      ? "blocked"
      : pressure >= 70
      ? "congested"
      : pressure >= 35
      ? "friction"
      : "smooth";

  const optimizationItems: FlowOptimizationItem[] = [];

  if (highRisk > 0) {
    optimizationItems.push({
      title: "Clear blocked workflows first",
      detail: "Resolve high-risk items before expanding new operational activity.",
      impact: "high",
    });
  }

  if (stale > 0) {
    optimizationItems.push({
      title: "Shorten delayed follow-up chains",
      detail: "Send follow-ups to inactive conversations to restore workflow movement.",
      impact: "high",
    });
  }

  if (pendingQuotes > 0) {
    optimizationItems.push({
      title: "Reduce quotation decision friction",
      detail: "Compare and close pending quote decisions to improve throughput.",
      impact: "medium",
    });
  }

  if (unread > 0) {
    optimizationItems.push({
      title: "Process unread operational messages",
      detail: "Review pending messages to prevent coordination delay.",
      impact: "medium",
    });
  }

  if (!optimizationItems.length) {
    optimizationItems.push({
      title: "Flow is stable",
      detail: "No major friction detected. Continue normal operational monitoring.",
      impact: "low",
    });
  }

  const summary =
    health === "blocked"
      ? "Operational flow has blockers that should be cleared first."
      : health === "congested"
      ? "Operational flow is congested and needs sequencing."
      : health === "friction"
      ? "Operational flow has manageable friction."
      : "Operational flow is smooth.";

  return {
    health,
    summary,
    optimizationItems,
  };
}
