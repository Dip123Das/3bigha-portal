export type ProcurementMomentumLevel =
  | "slow"
  | "stable"
  | "active"
  | "accelerating";

export type ProcurementMomentumSignals = {
  recentActivityCount?: number;

  vendorResponseCount?: number;

  quoteGrowth?: number;

  successfulFollowups?: number;

  workflowProgressDelta?: number;

  deliveryUpdates?: number;

  buyerEngagementScore?: number;

  vendorEngagementScore?: number;
};

export type ProcurementMomentumResult = {
  level: ProcurementMomentumLevel;

  score: number;

  reasons: string[];

  operationalMessage: string;
};

export function evaluateProcurementMomentum(
  signals: ProcurementMomentumSignals,
): ProcurementMomentumResult {
  let score = 0;

  const reasons: string[] = [];

  /*
   |--------------------------------------------------------------------------
   | Activity momentum
   |--------------------------------------------------------------------------
   */

  if ((signals.recentActivityCount ?? 0) >= 3) {
    score += 20;

    reasons.push("Workflow activity increasing.");
  }

  if ((signals.recentActivityCount ?? 0) >= 6) {
    score += 15;

    reasons.push("Operational engagement is strong.");
  }

  /*
   |--------------------------------------------------------------------------
   | Vendor responsiveness
   |--------------------------------------------------------------------------
   */

  if ((signals.vendorResponseCount ?? 0) >= 2) {
    score += 15;

    reasons.push("Vendor responses actively continuing.");
  }

  /*
   |--------------------------------------------------------------------------
   | Quote momentum
   |--------------------------------------------------------------------------
   */

  if ((signals.quoteGrowth ?? 0) >= 1) {
    score += 15;

    reasons.push("Quotation activity improving.");
  }

  /*
   |--------------------------------------------------------------------------
   | Follow-up success
   |--------------------------------------------------------------------------
   */

  if ((signals.successfulFollowups ?? 0) >= 1) {
    score += 10;

    reasons.push("Follow-up actions are working.");
  }

  /*
   |--------------------------------------------------------------------------
   | Workflow progression
   |--------------------------------------------------------------------------
   */

  if ((signals.workflowProgressDelta ?? 0) >= 10) {
    score += 15;

    reasons.push("Workflow progressing steadily.");
  }

  /*
   |--------------------------------------------------------------------------
   | Delivery movement
   |--------------------------------------------------------------------------
   */

  if ((signals.deliveryUpdates ?? 0) >= 1) {
    score += 10;

    reasons.push("Delivery execution updates detected.");
  }

  /*
   |--------------------------------------------------------------------------
   | Normalize
   |--------------------------------------------------------------------------
   */

  score = Math.max(0, Math.min(100, score));

  /*
   |--------------------------------------------------------------------------
   | Determine momentum level
   |--------------------------------------------------------------------------
   */

  let level: ProcurementMomentumLevel = "slow";

  if (score >= 20) level = "stable";
  if (score >= 45) level = "active";
  if (score >= 70) level = "accelerating";

  /*
   |--------------------------------------------------------------------------
   | Human operational message
   |--------------------------------------------------------------------------
   */

  let operationalMessage =
    "Workflow activity remains limited.";

  switch (level) {
    case "stable":
      operationalMessage =
        "Workflow activity is stable.";
      break;

    case "active":
      operationalMessage =
        "Procurement workflow progressing actively.";
      break;

    case "accelerating":
      operationalMessage =
        "Workflow momentum is accelerating strongly.";
      break;
  }

  return {
    level,
    score,
    reasons,
    operationalMessage,
  };
}
