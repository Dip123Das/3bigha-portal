import type { ExecutiveCognitiveState } from "@/lib/procurement/intelligence/executive-cognitive-os";
import type { SharedExecutiveFocusState } from "@/lib/procurement/intelligence/executive-attention-fabric";
import type { ProcurementStabilityIndex } from "@/lib/procurement/intelligence/strategic-executive-intelligence";
import type { OperationalMemoryHealth } from "@/lib/procurement/intelligence/operational-memory-fabric";
import type { AdaptiveOperationalLearningState } from "@/lib/procurement/intelligence/adaptive-operational-learning";

export type UnifiedOperationalConsciousnessState = {
  unifiedMissionCoherence: number;
  globalOperationalRhythm: number;
  synchronizedContinuityStability: number;
  executiveContextSynchronization: number;
  calmNetworkHealth: number;
  sequencingCoordinationIntegrity: number;
  operationalConsciousnessStability: number;
  consciousnessMode:
    | "stable"
    | "guided"
    | "compressed"
    | "recovery_sync";
  explanation: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function evaluateUnifiedOperationalConsciousness(input: {
  cognitive: ExecutiveCognitiveState;
  focus: SharedExecutiveFocusState;
  stability: ProcurementStabilityIndex;
  memory: OperationalMemoryHealth;
  learning: AdaptiveOperationalLearningState;
}): UnifiedOperationalConsciousnessState {
  const unifiedMissionCoherence = clamp(
    (input.cognitive.missionCoherence + input.stability.overallStability) / 2
  );

  const globalOperationalRhythm = clamp(
    (input.cognitive.operationalRhythmStability +
      input.stability.calmSustainability +
      input.learning.calmExecutionImprovement) / 3
  );

  const synchronizedContinuityStability = clamp(
    (input.cognitive.continuityIntegrity +
      input.memory.continuityPersistenceHealth +
      input.learning.continuityOptimizationScore) / 3
  );

  const executiveContextSynchronization = clamp(
    (input.cognitive.focusResilience +
      input.memory.executiveContextStability +
      input.learning.operationalLearningConfidence) / 3
  );

  const calmNetworkHealth = clamp(
    (globalOperationalRhythm +
      input.learning.missionStabilityLearningHealth +
      input.stability.calmSustainability) / 3
  );

  const sequencingCoordinationIntegrity = clamp(
    (input.cognitive.sequencingEfficiency +
      input.stability.sequencingHealth +
      input.learning.continuityOptimizationScore) / 3
  );

  const operationalConsciousnessStability = clamp(
    (unifiedMissionCoherence +
      globalOperationalRhythm +
      synchronizedContinuityStability +
      executiveContextSynchronization +
      calmNetworkHealth +
      sequencingCoordinationIntegrity) / 6
  );

  const consciousnessMode =
    input.focus.focusMode === "recovery" || input.stability.overloadRisk >= 75
      ? "recovery_sync"
      : input.focus.focusMode === "compressed" || input.memory.interruptionRecurrenceLevel >= 45
        ? "compressed"
        : input.focus.focusMode === "guided" || input.learning.recommendation !== "continue_current_rhythm"
          ? "guided"
          : "stable";

  const explanation =
    consciousnessMode === "recovery_sync"
      ? "Procurement OS is synchronizing recovery pacing across cognition, memory and attention layers."
      : consciousnessMode === "compressed"
        ? "Operational consciousness is compressing repeated interruptions to preserve calm sequencing."
        : consciousnessMode === "guided"
          ? "Operational layers are aligned for guided sequential execution."
          : "Unified operational consciousness remains stable across current procurement layers.";

  return {
    unifiedMissionCoherence,
    globalOperationalRhythm,
    synchronizedContinuityStability,
    executiveContextSynchronization,
    calmNetworkHealth,
    sequencingCoordinationIntegrity,
    operationalConsciousnessStability,
    consciousnessMode,
    explanation,
  };
}
