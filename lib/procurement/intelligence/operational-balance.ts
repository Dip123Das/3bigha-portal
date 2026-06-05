import {
  evaluateProcurementDecay,
  type ProcurementDecaySignals,
} from "./decay-signals";

import {
  evaluateProcurementMomentum,
  type ProcurementMomentumSignals,
} from "./momentum-signals";

export type ProcurementOperationalBalance =
  | "optimized"
  | "stable"
  | "recovering"
  | "early_warning"
  | "deteriorating"
  | "critical";

export type ProcurementOperationalBalanceResult = {
  level: ProcurementOperationalBalance;

  operationalMessage: string;

  decayScore: number;

  momentumScore: number;

  reasons: string[];
};

export function evaluateOperationalBalance(input: {
  decay: ProcurementDecaySignals;

  momentum: ProcurementMomentumSignals;
}): ProcurementOperationalBalanceResult {
  const decay = evaluateProcurementDecay(input.decay);

  const momentum = evaluateProcurementMomentum(input.momentum);

  const reasons = [
    ...decay.reasons,
    ...momentum.reasons,
  ];

  /*
   |--------------------------------------------------------------------------
   | Critical deterioration
   |--------------------------------------------------------------------------
   */

  if (
    decay.level === "critical" &&
    momentum.level === "slow"
  ) {
    return {
      level: "critical",
      operationalMessage:
        "Workflow requires immediate operational intervention.",
      decayScore: decay.score,
      momentumScore: momentum.score,
      reasons,
    };
  }

  /*
   |--------------------------------------------------------------------------
   | Deterioration
   |--------------------------------------------------------------------------
   */

  if (
    ["stale", "critical"].includes(decay.level) &&
    ["slow", "stable"].includes(momentum.level)
  ) {
    return {
      level: "deteriorating",
      operationalMessage:
        "Workflow continuity is weakening.",
      decayScore: decay.score,
      momentumScore: momentum.score,
      reasons,
    };
  }

  /*
   |--------------------------------------------------------------------------
   | Recovery state
   |--------------------------------------------------------------------------
   */

  if (
    ["stale", "slowing"].includes(decay.level) &&
    ["active", "accelerating"].includes(momentum.level)
  ) {
    return {
      level: "recovering",
      operationalMessage:
        "Workflow activity is recovering.",
      decayScore: decay.score,
      momentumScore: momentum.score,
      reasons,
    };
  }

  /*
   |--------------------------------------------------------------------------
   | Early warning
   |--------------------------------------------------------------------------
   */

  if (
    ["watch", "slowing"].includes(decay.level) &&
    momentum.level === "stable"
  ) {
    return {
      level: "early_warning",
      operationalMessage:
        "Workflow should be monitored closely.",
      decayScore: decay.score,
      momentumScore: momentum.score,
      reasons,
    };
  }

  /*
   |--------------------------------------------------------------------------
   | Optimized operations
   |--------------------------------------------------------------------------
   */

  if (
    decay.level === "healthy" &&
    ["active", "accelerating"].includes(momentum.level)
  ) {
    return {
      level: "optimized",
      operationalMessage:
        "Procurement workflow operating efficiently.",
      decayScore: decay.score,
      momentumScore: momentum.score,
      reasons,
    };
  }

  /*
   |--------------------------------------------------------------------------
   | Stable default
   |--------------------------------------------------------------------------
   */

  return {
    level: "stable",
    operationalMessage:
      "Workflow continuity remains stable.",
    decayScore: decay.score,
    momentumScore: momentum.score,
    reasons,
  };
}
