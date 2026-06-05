export type ProcurementMemoryReliability =
  | "unknown"
  | "reliable"
  | "watch"
  | "inconsistent"
  | "high_risk";

export type ProcurementMemoryProfile = {
  entityId: string;

  entityType: "vendor" | "buyer" | "rfq" | "workflow";

  totalInteractions?: number;

  successfulResponses?: number;

  delayedResponses?: number;

  missedResponses?: number;

  completedWorkflows?: number;

  stalledWorkflows?: number;

  recoveredWorkflows?: number;

  deliveryDelayCount?: number;

  lastInteractionAt?: string | number | null;
};

export type ProcurementMemoryProfileResult = {
  reliability: ProcurementMemoryReliability;

  score: number;

  reasons: string[];

  operationalMessage: string;
};

export function evaluateProcurementMemoryProfile(
  profile: ProcurementMemoryProfile,
): ProcurementMemoryProfileResult {
  let score = 50;

  const reasons: string[] = [];

  if ((profile.totalInteractions ?? 0) === 0) {
    return {
      reliability: "unknown",
      score,
      reasons: ["No previous procurement history available."],
      operationalMessage:
        "No previous operational memory is available yet.",
    };
  }

  if ((profile.successfulResponses ?? 0) >= 3) {
    score += 20;
    reasons.push("Consistent successful responses recorded.");
  }

  if ((profile.completedWorkflows ?? 0) >= 2) {
    score += 20;
    reasons.push("Previous workflows completed successfully.");
  }

  if ((profile.recoveredWorkflows ?? 0) >= 1) {
    score += 10;
    reasons.push("Past workflow recovery detected.");
  }

  if ((profile.delayedResponses ?? 0) >= 2) {
    score -= 15;
    reasons.push("Repeated delayed responses recorded.");
  }

  if ((profile.missedResponses ?? 0) >= 1) {
    score -= 20;
    reasons.push("Missed responses detected in previous workflows.");
  }

  if ((profile.stalledWorkflows ?? 0) >= 1) {
    score -= 20;
    reasons.push("Previous workflow stall detected.");
  }

  if ((profile.deliveryDelayCount ?? 0) >= 1) {
    score -= 15;
    reasons.push("Previous delivery delay recorded.");
  }

  score = Math.max(0, Math.min(100, score));

  let reliability: ProcurementMemoryReliability = "watch";

  if (score >= 75) reliability = "reliable";
  if (score >= 50 && score < 75) reliability = "watch";
  if (score >= 30 && score < 50) reliability = "inconsistent";
  if (score < 30) reliability = "high_risk";

  let operationalMessage =
    "Monitor this procurement relationship carefully.";

  switch (reliability) {
    case "reliable":
      operationalMessage =
        "Past procurement behavior appears reliable.";
      break;

    case "inconsistent":
      operationalMessage =
        "Past procurement behavior has been inconsistent.";
      break;

    case "high_risk":
      operationalMessage =
        "Past procurement behavior shows high operational risk.";
      break;
  }

  return {
    reliability,
    score,
    reasons,
    operationalMessage,
  };
}
