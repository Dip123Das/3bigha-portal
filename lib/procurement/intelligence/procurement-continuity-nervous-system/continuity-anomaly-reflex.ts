import type { ProcurementContinuityNervousSystem } from "./procurement-continuity-nervous-system";

export type ContinuityAnomalyReflexState = {
  anomalyMode:
    | "stable"
    | "watched"
    | "reflex_stabilized";
  anomalyResilience: number;
  explanation: string;
};

export function evaluateContinuityAnomalyReflex(
  nervousSystem: ProcurementContinuityNervousSystem
): ContinuityAnomalyReflexState {
  if (nervousSystem.continuityAnomalyResilience < 55) {
    return {
      anomalyMode: "reflex_stabilized",
      anomalyResilience: nervousSystem.continuityAnomalyResilience,
      explanation:
        "Continuity anomaly reflex stabilized pressure before it spread across workflows.",
    };
  }

  if (nervousSystem.continuityAnomalyResilience < 75) {
    return {
      anomalyMode: "watched",
      anomalyResilience: nervousSystem.continuityAnomalyResilience,
      explanation:
        "Continuity anomaly resilience remains under calm watch.",
    };
  }

  return {
    anomalyMode: "stable",
    anomalyResilience: nervousSystem.continuityAnomalyResilience,
    explanation:
      "Continuity anomaly resilience remains stable.",
  };
}
