export type ProcurementDecayLevel =
  | "healthy"
  | "watch"
  | "slowing"
  | "stale"
  | "critical";

export type ProcurementDecaySignals = {
  workflowAgeHours: number;
  hoursSinceLastActivity: number;
  hoursSinceVendorResponse?: number;
  unreadBuyerMessages?: number;
  unreadVendorMessages?: number;
  quoteCount?: number;
  vendorEngagementScore?: number;
  followupCount?: number;
  staleHeartbeatCount?: number;
  delayedDeliverySignals?: number;
  activityVelocity?: number;
};

export type ProcurementDecayResult = {
  level: ProcurementDecayLevel;
  score: number;
  reasons: string[];
  recommendedAction?: string;
};

export function evaluateProcurementDecay(
  signals: ProcurementDecaySignals,
): ProcurementDecayResult {
  let score = 100;
  const reasons: string[] = [];

  if (signals.hoursSinceLastActivity >= 24) {
    score -= 10;
    reasons.push("No activity in the last 24 hours.");
  }

  if (signals.hoursSinceLastActivity >= 48) {
    score -= 20;
    reasons.push("Workflow activity is slowing.");
  }

  if (signals.hoursSinceLastActivity >= 72) {
    score -= 30;
    reasons.push("Workflow has become stale.");
  }

  if (
    signals.hoursSinceVendorResponse &&
    signals.hoursSinceVendorResponse >= 48
  ) {
    score -= 15;
    reasons.push("Vendor response is delayed.");
  }

  if (
    signals.hoursSinceVendorResponse &&
    signals.hoursSinceVendorResponse >= 72
  ) {
    score -= 25;
    reasons.push("Vendor engagement is becoming inactive.");
  }

  if (
    signals.workflowAgeHours >= 48 &&
    (signals.quoteCount ?? 0) === 0
  ) {
    score -= 20;
    reasons.push("No quotations received yet.");
  }

  if ((signals.followupCount ?? 0) >= 3) {
    score -= 10;
    reasons.push("Multiple follow-ups detected.");
  }

  if ((signals.staleHeartbeatCount ?? 0) >= 2) {
    score -= 15;
    reasons.push("Operational heartbeat signals are weakening.");
  }

  if ((signals.delayedDeliverySignals ?? 0) >= 1) {
    score -= 20;
    reasons.push("Potential delivery delay indicators detected.");
  }

  score = Math.max(0, Math.min(100, score));

  let level: ProcurementDecayLevel = "healthy";

  if (score <= 80) level = "watch";
  if (score <= 60) level = "slowing";
  if (score <= 40) level = "stale";
  if (score <= 20) level = "critical";

  let recommendedAction: string | undefined;

  switch (level) {
    case "watch":
      recommendedAction =
        "Monitor workflow activity and vendor responsiveness.";
      break;
    case "slowing":
      recommendedAction =
        "Consider sending a follow-up to vendors.";
      break;
    case "stale":
      recommendedAction =
        "Workflow needs operational attention.";
      break;
    case "critical":
      recommendedAction =
        "Immediate intervention recommended.";
      break;
  }

  return {
    level,
    score,
    reasons,
    recommendedAction,
  };
}
