export type DistributionPressure =
  | "stable"
  | "elevated"
  | "overloaded"
  | "critical";

export type DistributionRecommendation = {
  title: string;
  detail: string;
  severity: DistributionPressure;
};

export type ExecutionDistributionResult = {
  pressure: DistributionPressure;
  summary: string;
  recommendations: DistributionRecommendation[];
  bottlenecks: string[];
};

function resolvePressure(score: number): DistributionPressure {
  if (score >= 90) return "critical";
  if (score >= 65) return "overloaded";
  if (score >= 40) return "elevated";
  return "stable";
}

export function buildExecutionDistribution(input: {
  unread?: number;
  stale?: number;
  highRisk?: number;
  activeThreads?: number;
  pendingQuotes?: number;
}) : ExecutionDistributionResult {
  const unread = input.unread || 0;
  const stale = input.stale || 0;
  const highRisk = input.highRisk || 0;
  const activeThreads = input.activeThreads || 0;
  const pendingQuotes = input.pendingQuotes || 0;

  const score =
    unread * 2 +
    stale * 5 +
    highRisk * 7 +
    pendingQuotes * 3 +
    Math.min(25, activeThreads);

  const pressure = resolvePressure(score);

  const recommendations: DistributionRecommendation[] = [];
  const bottlenecks: string[] = [];

  if (highRisk > 0) {
    recommendations.push({
      title: "Reduce high-risk operational congestion",
      detail: "Resolve critical workflows before expanding execution volume.",
      severity: "critical",
    });

    bottlenecks.push("High-risk execution congestion");
  }

  if (stale > 0) {
    recommendations.push({
      title: "Recover delayed workflow chains",
      detail: "Delayed operational threads are increasing execution pressure.",
      severity: "overloaded",
    });

    bottlenecks.push("Delayed workflow accumulation");
  }

  if (pendingQuotes > 0) {
    recommendations.push({
      title: "Clear quotation decision backlog",
      detail: "Pending quotation approvals are slowing workflow velocity.",
      severity: "elevated",
    });

    bottlenecks.push("Quotation approval delay");
  }

  if (unread > 0) {
    recommendations.push({
      title: "Reduce unread communication queue",
      detail: "Unread workflow messages are increasing coordination pressure.",
      severity: "elevated",
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      title: "Operational execution balanced",
      detail: "Current workflow execution pressure remains stable.",
      severity: "stable",
    });
  }

  const summary =
    pressure === "critical"
      ? "Operational execution pressure is critically overloaded."
      : pressure === "overloaded"
      ? "Operational execution pressure is overloaded."
      : pressure === "elevated"
      ? "Operational execution pressure is elevated."
      : "Operational execution pressure currently stable.";

  return {
    pressure,
    summary,
    recommendations,
    bottlenecks,
  };
}
