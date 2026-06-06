import type { OperationalMemoryHealth } from "@/lib/procurement/intelligence/operational-memory-fabric";
import type { ProcurementStabilityIndex } from "@/lib/procurement/intelligence/strategic-executive-intelligence";

export type AdaptiveOperationalLearningState = {
  operationalLearningConfidence: number;
  continuityOptimizationScore: number;
  calmExecutionImprovement: number;
  missionStabilityLearningHealth: number;
  recommendation:
    | "continue_current_rhythm"
    | "increase_sequence_protection"
    | "compress_interruptions_earlier"
    | "strengthen_recovery_pacing";
  explanation: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function evaluateAdaptiveOperationalLearning(
  memory: OperationalMemoryHealth,
  stability: ProcurementStabilityIndex
): AdaptiveOperationalLearningState {
  const operationalLearningConfidence = clamp(
    (memory.operationalMemoryConfidence + stability.overallStability) / 2
  );

  const continuityOptimizationScore = clamp(
    (memory.continuityPersistenceHealth + (100 - stability.continuityRisk)) / 2
  );

  const calmExecutionImprovement = clamp(
    (stability.calmSustainability + memory.executiveContextStability) / 2
  );

  const missionStabilityLearningHealth = clamp(
    (operationalLearningConfidence + continuityOptimizationScore + calmExecutionImprovement) / 3
  );

  const recommendation =
    stability.overloadRisk >= 70
      ? "strengthen_recovery_pacing"
      : memory.interruptionRecurrenceLevel >= 45
        ? "compress_interruptions_earlier"
        : continuityOptimizationScore < 65
          ? "increase_sequence_protection"
          : "continue_current_rhythm";

  const explanation =
    recommendation === "strengthen_recovery_pacing"
      ? "Repeated pressure suggests recovery pacing should be strengthened before new operational expansion."
      : recommendation === "compress_interruptions_earlier"
        ? "Interruption recurrence is rising; low-value signals should be grouped earlier."
        : recommendation === "increase_sequence_protection"
          ? "Continuity protection should remain active to preserve unfinished workflow context."
          : "Current operating rhythm is learning as stable and can continue calmly.";

  return {
    operationalLearningConfidence,
    continuityOptimizationScore,
    calmExecutionImprovement,
    missionStabilityLearningHealth,
    recommendation,
    explanation,
  };
}
