import type { UnifiedOperationalConsciousnessState } from "@/lib/procurement/intelligence/unified-operational-consciousness";
import type { AdaptiveOperationalLearningState } from "@/lib/procurement/intelligence/adaptive-operational-learning";
import type { OperationalMemoryHealth } from "@/lib/procurement/intelligence/operational-memory-fabric";

export type SupervisedOperationalAssistanceState = {
  assistanceConfidence: number;
  continuitySafeRecommendationLevel: number;
  executiveWorkloadReductionScore: number;
  supervisedExecutionReadiness: number;
  calmAssistanceQuality: number;
  sequencingAssistanceStability: number;
  operationalAssistanceHealth: number;
  assistanceMode:
    | "observe"
    | "suggest_sequence"
    | "prepare_recovery"
    | "compress_interruptions"
    | "reduce_workload";
  explanation: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function evaluateSupervisedOperationalAssistance(input: {
  consciousness: UnifiedOperationalConsciousnessState;
  learning: AdaptiveOperationalLearningState;
  memory: OperationalMemoryHealth;
}): SupervisedOperationalAssistanceState {
  const assistanceConfidence = clamp(
    (input.consciousness.operationalConsciousnessStability +
      input.learning.operationalLearningConfidence +
      input.memory.operationalMemoryConfidence) / 3
  );

  const continuitySafeRecommendationLevel = clamp(
    (input.consciousness.synchronizedContinuityStability +
      input.learning.continuityOptimizationScore +
      input.memory.continuityPersistenceHealth) / 3
  );

  const executiveWorkloadReductionScore = clamp(
    100 - Math.min(100, input.memory.interruptionRecurrenceLevel)
  );

  const supervisedExecutionReadiness = clamp(
    (assistanceConfidence + continuitySafeRecommendationLevel) / 2
  );

  const calmAssistanceQuality = clamp(
    (input.consciousness.calmNetworkHealth +
      input.learning.calmExecutionImprovement) / 2
  );

  const sequencingAssistanceStability = clamp(
    input.consciousness.sequencingCoordinationIntegrity
  );

  const operationalAssistanceHealth = clamp(
    (assistanceConfidence +
      continuitySafeRecommendationLevel +
      supervisedExecutionReadiness +
      calmAssistanceQuality +
      sequencingAssistanceStability) / 5
  );

  const assistanceMode =
    input.consciousness.consciousnessMode === "recovery_sync"
      ? "prepare_recovery"
      : input.memory.interruptionRecurrenceLevel >= 45
        ? "compress_interruptions"
        : input.learning.recommendation === "increase_sequence_protection"
          ? "suggest_sequence"
          : executiveWorkloadReductionScore < 55
            ? "reduce_workload"
            : "observe";

  const explanation =
    assistanceMode === "prepare_recovery"
      ? "Prepare a supervised recovery sequence before expanding operational work."
      : assistanceMode === "compress_interruptions"
        ? "Prepare low-value interruption grouping to protect executive focus."
        : assistanceMode === "suggest_sequence"
          ? "Suggest a continuity-safe sequence so unfinished context remains protected."
          : assistanceMode === "reduce_workload"
            ? "Prepare workload reduction guidance to reduce repeated executive re-analysis."
            : "Assistance layer is observing; no stronger action draft is required.";

  return {
    assistanceConfidence,
    continuitySafeRecommendationLevel,
    executiveWorkloadReductionScore,
    supervisedExecutionReadiness,
    calmAssistanceQuality,
    sequencingAssistanceStability,
    operationalAssistanceHealth,
    assistanceMode,
    explanation,
  };
}
