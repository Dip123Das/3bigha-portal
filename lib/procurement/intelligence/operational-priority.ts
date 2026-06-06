import {
  evaluateOperationalBalance,
  type ProcurementOperationalBalance,
} from "./operational-balance";

import type {
  ProcurementDecaySignals,
} from "./decay-signals";

import type {
  ProcurementMomentumSignals,
} from "./momentum-signals";

export type ProcurementAttentionLevel =
  | "critical"
  | "high"
  | "active"
  | "watch"
  | "background";

export type ProcurementOperationalPriorityResult = {
  attentionScore: number;

  attentionLevel: ProcurementAttentionLevel;

  operationalBalance: ProcurementOperationalBalance;

  urgencyScore: number;

  decayScore: number;

  momentumScore: number;

  priorityReasons: string[];

  recommendedAttention: string;
};

export function calculateOperationalAttentionPriority(input: {
  decay: ProcurementDecaySignals;

  momentum: ProcurementMomentumSignals;

  urgency?: number;

  workflowHealth?: number;

  aiConfidence?: number;

  escalationSignals?: number;

  recoverySignals?: number;

  operationalRisk?: number;
}): ProcurementOperationalPriorityResult {
  const balance = evaluateOperationalBalance({
    decay: input.decay,
    momentum: input.momentum,
  });

  let score = 0;

  /*
   |--------------------------------------------------------------------------
   | Base operational balance
   |--------------------------------------------------------------------------
   */

  switch (balance.level) {
    case "critical":
      score += 95;
      break;

    case "deteriorating":
      score += 80;
      break;

    case "early_warning":
      score += 60;
      break;

    case "recovering":
      score += 50;
      break;

    case "stable":
      score += 35;
      break;

    case "optimized":
      score += 20;
      break;
  }

  /*
   |--------------------------------------------------------------------------
   | Urgency amplification
   |--------------------------------------------------------------------------
   */

  score += Math.min(20, input.urgency ?? 0);

  /*
   |--------------------------------------------------------------------------
   | Operational risk
   |--------------------------------------------------------------------------
   */

  score += Math.min(15, input.operationalRisk ?? 0);

  /*
   |--------------------------------------------------------------------------
   | Escalation pressure
   |--------------------------------------------------------------------------
   */

  score += Math.min(
    15,
    (input.escalationSignals ?? 0) * 5,
  );

  /*
   |--------------------------------------------------------------------------
   | Recovery stabilization lowers pressure slightly
   |--------------------------------------------------------------------------
   */

  score -= Math.min(
    10,
    (input.recoverySignals ?? 0) * 2,
  );

  /*
   |--------------------------------------------------------------------------
   | Workflow health normalization
   |--------------------------------------------------------------------------
   */

  if ((input.workflowHealth ?? 100) <= 50) {
    score += 10;
  }

  if ((input.workflowHealth ?? 100) <= 30) {
    score += 10;
  }

  /*
   |--------------------------------------------------------------------------
   | AI confidence normalization
   |--------------------------------------------------------------------------
   */

  if ((input.aiConfidence ?? 100) <= 40) {
    score -= 5;
  }

  /*
   |--------------------------------------------------------------------------
   | Normalize
   |--------------------------------------------------------------------------
   */

  score = Math.max(0, Math.min(100, score));

  /*
   |--------------------------------------------------------------------------
   | Attention level
   |--------------------------------------------------------------------------
   */

  let attentionLevel: ProcurementAttentionLevel =
    "background";

  if (score >= 85) {
    attentionLevel = "critical";
  } else if (score >= 70) {
    attentionLevel = "high";
  } else if (score >= 50) {
    attentionLevel = "active";
  } else if (score >= 30) {
    attentionLevel = "watch";
  }

  /*
   |--------------------------------------------------------------------------
   | Human operational recommendation
   |--------------------------------------------------------------------------
   */

  let recommendedAttention =
    "Operational monitoring sufficient.";

  switch (attentionLevel) {
    case "critical":
      recommendedAttention =
        "Immediate operational attention recommended.";
      break;

    case "high":
      recommendedAttention =
        "Prioritize workflow stabilization.";
      break;

    case "active":
      recommendedAttention =
        "Maintain active procurement monitoring.";
      break;

    case "watch":
      recommendedAttention =
        "Monitor workflow carefully.";
      break;
  }

  /*
   |--------------------------------------------------------------------------
   | Explainability reasons
   |--------------------------------------------------------------------------
   */

  const priorityReasons = [
    ...balance.reasons,
  ];

  if ((input.urgency ?? 0) >= 10) {
    priorityReasons.push(
      "Urgency escalation detected.",
    );
  }

  if ((input.operationalRisk ?? 0) >= 10) {
    priorityReasons.push(
      "Operational risk indicators elevated.",
    );
  }

  if ((input.recoverySignals ?? 0) >= 2) {
    priorityReasons.push(
      "Recovery stabilization signals detected.",
    );
  }

  return {
    attentionScore: score,

    attentionLevel,

    operationalBalance: balance.level,

    urgencyScore: input.urgency ?? 0,

    decayScore: balance.decayScore,

    momentumScore: balance.momentumScore,

    priorityReasons,

    recommendedAttention,
  };
}

/*
|--------------------------------------------------------------------------
| Safe sorting helper
|--------------------------------------------------------------------------
*/

export function sortByOperationalAttention<T>(
  items: T[],
  getter: (
    item: T,
  ) => ProcurementOperationalPriorityResult,
): T[] {
  return [...items].sort((a, b) => {
    return (
      getter(b).attentionScore -
      getter(a).attentionScore
    );
  });
}
