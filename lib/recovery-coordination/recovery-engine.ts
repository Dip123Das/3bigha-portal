export type RecoveryUrgency = "stable" | "monitor" | "recover" | "urgent";

export type RecoveryStep = {
  title: string;
  detail: string;
  urgency: RecoveryUrgency;
};

export type RecoveryCoordinationResult = {
  urgency: RecoveryUrgency;
  summary: string;
  stalledSignals: string[];
  recoverySteps: RecoveryStep[];
};

function resolveUrgency(score: number): RecoveryUrgency {
  if (score >= 75) return "urgent";
  if (score >= 45) return "recover";
  if (score >= 20) return "monitor";
  return "stable";
}

export function buildRecoveryCoordination(input: {
  unread?: number;
  stale?: number;
  highRisk?: number;
  pendingQuotes?: number;
  activeThreads?: number;
}): RecoveryCoordinationResult {
  const unread = input.unread || 0;
  const stale = input.stale || 0;
  const highRisk = input.highRisk || 0;
  const pendingQuotes = input.pendingQuotes || 0;
  const activeThreads = input.activeThreads || 0;

  const score =
    unread * 2 +
    stale * 7 +
    highRisk * 9 +
    pendingQuotes * 3 +
    Math.min(15, activeThreads);

  const urgency = resolveUrgency(score);
  const stalledSignals: string[] = [];
  const recoverySteps: RecoveryStep[] = [];

  if (highRisk > 0) {
    stalledSignals.push("Critical workflow instability");
    recoverySteps.push({
      title: "Stabilize critical workflow first",
      detail: "Handle high-risk workflow before adding new execution load.",
      urgency: "urgent",
    });
  }

  if (stale > 0) {
    stalledSignals.push("Stalled follow-up chain");
    recoverySteps.push({
      title: "Restart stalled conversations",
      detail: "Send follow-up or reroute delayed operational threads.",
      urgency: "recover",
    });
  }

  if (pendingQuotes > 0) {
    stalledSignals.push("Quotation decision delay");
    recoverySteps.push({
      title: "Clear quotation decision queue",
      detail: "Finalize pending RFQ comparison to unblock procurement movement.",
      urgency: "monitor",
    });
  }

  if (unread > 0) {
    stalledSignals.push("Unread coordination delay");
    recoverySteps.push({
      title: "Review unread operational messages",
      detail: "Clear unread items to reduce coordination delay.",
      urgency: "monitor",
    });
  }

  if (!recoverySteps.length) {
    recoverySteps.push({
      title: "Recovery not required",
      detail: "No major stalled workflow detected. Continue normal monitoring.",
      urgency: "stable",
    });
  }

  const summary =
    urgency === "urgent"
      ? "Recovery coordination is urgently recommended."
      : urgency === "recover"
      ? "Some workflows may need recovery coordination."
      : urgency === "monitor"
      ? "Minor recovery signals detected. Monitor closely."
      : "No recovery action required now.";

  return {
    urgency,
    summary,
    stalledSignals,
    recoverySteps,
  };
}
