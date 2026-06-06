import type { ProcurementContinuityNervousSystem } from "./procurement-continuity-nervous-system";

export type OperationalReflexState = {
  reflexMode:
    | "stable"
    | "guided"
    | "stabilized";
  reflexScore: number;
  explanation: string;
};

export function evaluateOperationalReflex(
  nervousSystem: ProcurementContinuityNervousSystem
): OperationalReflexState {
  if (nervousSystem.operationalReflexStability < 58) {
    return {
      reflexMode: "stabilized",
      reflexScore: nervousSystem.operationalReflexStability,
      explanation:
        "Operational reflex stabilization increased to reduce execution rhythm disruption.",
    };
  }

  if (nervousSystem.operationalReflexStability < 75) {
    return {
      reflexMode: "guided",
      reflexScore: nervousSystem.operationalReflexStability,
      explanation:
        "Operational reflex remains guided for calm execution rhythm.",
    };
  }

  return {
    reflexMode: "stable",
    reflexScore: nervousSystem.operationalReflexStability,
    explanation:
      "Operational reflex remains stable.",
  };
}
