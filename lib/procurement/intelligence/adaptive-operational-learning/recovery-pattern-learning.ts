import type { RecoveryEffectivenessMemory } from "@/lib/procurement/intelligence/operational-memory-fabric";

export type RecoveryPatternLearning = {
  recoveryAdaptationQuality: number;
  recoveryLearningMode:
    | "normal"
    | "followup_required"
    | "repeat_pressure_review";
  explanation: string;
};

export function evaluateRecoveryPatternLearning(
  recoveryMemory: RecoveryEffectivenessMemory
): RecoveryPatternLearning {
  if (recoveryMemory.recoveryEffectivenessTrend === "recovery_pressure_repeating") {
    return {
      recoveryAdaptationQuality: Math.max(35, recoveryMemory.recoveryMemoryScore),
      recoveryLearningMode: "repeat_pressure_review",
      explanation:
        "Recovery pressure is repeating; review the recovery path before increasing workflow load.",
    };
  }

  if (recoveryMemory.recoveryEffectivenessTrend === "needs_followup") {
    return {
      recoveryAdaptationQuality: recoveryMemory.recoveryMemoryScore,
      recoveryLearningMode: "followup_required",
      explanation:
        "Follow-up pacing should be preserved until actionable items reduce.",
    };
  }

  return {
    recoveryAdaptationQuality: recoveryMemory.recoveryMemoryScore,
    recoveryLearningMode: "normal",
    explanation:
      "Recovery pattern is stable and no stronger adaptation is needed.",
  };
}
