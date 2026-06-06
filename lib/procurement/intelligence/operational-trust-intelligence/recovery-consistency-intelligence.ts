import type { OperationalTrustIntelligence } from "./operational-trust-intelligence";

export type RecoveryConsistencyState = {
  consistencyMode:
    | "stable"
    | "guided"
    | "review_recovery";
  consistencyScore: number;
  explanation: string;
};

export function evaluateRecoveryConsistency(
  trust: OperationalTrustIntelligence
): RecoveryConsistencyState {
  if (trust.recoveryConsistency < 55) {
    return {
      consistencyMode: "review_recovery",
      consistencyScore: trust.recoveryConsistency,
      explanation:
        "Recovery consistency weakened and recovery pacing should be reviewed.",
    };
  }

  if (trust.recoveryConsistency < 75) {
    return {
      consistencyMode: "guided",
      consistencyScore: trust.recoveryConsistency,
      explanation:
        "Recovery consistency remains usable with calmer operational pacing.",
    };
  }

  return {
    consistencyMode: "stable",
    consistencyScore: trust.recoveryConsistency,
    explanation:
      "Recovery consistency remains stable across current operational flow.",
  };
}
