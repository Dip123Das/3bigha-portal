export type WorkloadHealth =
  | "stable"
  | "moderate"
  | "high"
  | "critical";

export type WorkloadSignal = {
  label: string;
  value: number;
  detail: string;
};

export type OperationalWorkloadResult = {
  health: WorkloadHealth;
  score: number;
  summary: string;
  signals: WorkloadSignal[];
  recommendation: string;
};

function resolveHealth(score: number): WorkloadHealth {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "moderate";
  return "stable";
}

export function buildOperationalWorkload(input: {
  unread?: number;
  stale?: number;
  highRisk?: number;
  activeThreads?: number;
  pendingQuotes?: number;
}) : OperationalWorkloadResult {
  const unread = input.unread || 0;
  const stale = input.stale || 0;
  const highRisk = input.highRisk || 0;
  const activeThreads = input.activeThreads || 0;
  const pendingQuotes = input.pendingQuotes || 0;

  const score =
    unread * 2 +
    stale * 4 +
    highRisk * 6 +
    pendingQuotes * 3 +
    Math.min(20, activeThreads);

  const health = resolveHealth(score);

  const signals: WorkloadSignal[] = [];

  if (highRisk > 0) {
    signals.push({
      label: "High-risk workflows",
      value: highRisk,
      detail: "Operational attention required immediately.",
    });
  }

  if (stale > 0) {
    signals.push({
      label: "Delayed workflows",
      value: stale,
      detail: "Follow-up recovery recommended.",
    });
  }

  if (unread > 0) {
    signals.push({
      label: "Unread actions",
      value: unread,
      detail: "Operational communication pending review.",
    });
  }

  if (pendingQuotes > 0) {
    signals.push({
      label: "Pending quotations",
      value: pendingQuotes,
      detail: "Quotation comparison awaiting decision.",
    });
  }

  const summary =
    health === "critical"
      ? "Operational workload is critically elevated."
      : health === "high"
      ? "Operational workload is running high."
      : health === "moderate"
      ? "Operational workload is manageable but active."
      : "Operational workload currently stable.";

  const recommendation =
    health === "critical"
      ? "Resolve escalations and reduce execution backlog immediately."
      : health === "high"
      ? "Prioritize urgent execution workflows first."
      : health === "moderate"
      ? "Maintain workflow sequencing and monitor delays."
      : "Continue stable operational monitoring.";

  return {
    health,
    score,
    summary,
    signals,
    recommendation,
  };
}
