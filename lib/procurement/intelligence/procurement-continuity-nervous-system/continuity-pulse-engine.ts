import type { ProcurementContinuityNervousSystem } from "./procurement-continuity-nervous-system";

export type ContinuityPulseState = {
  pulseMode:
    | "stable"
    | "guided"
    | "synchronized";
  pulseScore: number;
  explanation: string;
};

export function evaluateContinuityPulse(
  nervousSystem: ProcurementContinuityNervousSystem
): ContinuityPulseState {
  if (nervousSystem.continuityPulseSynchronization < 60) {
    return {
      pulseMode: "synchronized",
      pulseScore: nervousSystem.continuityPulseSynchronization,
      explanation:
        "Continuity pulse synchronization increased to preserve workflow stability.",
    };
  }

  if (nervousSystem.continuityPulseSynchronization < 76) {
    return {
      pulseMode: "guided",
      pulseScore: nervousSystem.continuityPulseSynchronization,
      explanation:
        "Continuity pulse remains guided across active procurement workflows.",
    };
  }

  return {
    pulseMode: "stable",
    pulseScore: nervousSystem.continuityPulseSynchronization,
    explanation:
      "Continuity pulse remains stable.",
  };
}
