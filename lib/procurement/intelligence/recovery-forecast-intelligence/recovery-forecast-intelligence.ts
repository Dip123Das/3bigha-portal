import type { ProcurementContinuityNervousSystem } from "@/lib/procurement/intelligence/procurement-continuity-nervous-system";
import type { ProcurementCognitiveExecutionMesh } from "@/lib/procurement/intelligence/procurement-cognitive-execution-mesh";
import type { OperationalTrustIntelligence } from "@/lib/procurement/intelligence/operational-trust-intelligence";

export type RecoveryForecastIntelligence = {
  recoveryMeshHealth: number;
  continuityForecastHealth: number;
  disruptionForecastRisk: number;
  recoveryPathStability: number;
  delayPropagationRisk: number;
  escalationForecastRisk: number;
  recoveryForecastMode:
    | "stable"
    | "guided"
    | "watch_delay"
    | "recovery_first";
  explanation: string;
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function evaluateRecoveryForecastIntelligence(input: {
  nervousSystem: ProcurementContinuityNervousSystem;
  mesh: ProcurementCognitiveExecutionMesh;
  trust: OperationalTrustIntelligence;
}): RecoveryForecastIntelligence {
  const recoveryMeshHealth = clamp(
    (input.nervousSystem.operationalReflexStability +
      input.mesh.executionPropagationIntegrity +
      input.trust.recoveryConsistency) / 3
  );

  const continuityForecastHealth = clamp(
    (input.nervousSystem.continuityPulseSynchronization +
      input.mesh.continuityLinkedExecutionHealth +
      input.trust.continuityConfidence) / 3
  );

  const disruptionForecastRisk = clamp(
    100 -
      (input.nervousSystem.continuityAnomalyResilience +
        input.trust.workflowPredictability) /
        2
  );

  const recoveryPathStability = clamp(
    (recoveryMeshHealth + input.trust.executionReliability) / 2
  );

  const delayPropagationRisk = clamp(
    100 -
      (input.mesh.executionPropagationIntegrity +
        input.nervousSystem.executionRhythmReflexStability) /
        2
  );

  const escalationForecastRisk = clamp(
    (disruptionForecastRisk + delayPropagationRisk) / 2
  );

  const recoveryForecastMode =
    escalationForecastRisk >= 55
      ? "recovery_first"
      : delayPropagationRisk >= 42
        ? "watch_delay"
        : recoveryPathStability < 72
          ? "guided"
          : "stable";

  const explanation =
    recoveryForecastMode === "recovery_first"
      ? "Recovery-first handling is recommended because escalation pressure may spread."
      : recoveryForecastMode === "watch_delay"
        ? "Delay propagation should remain under calm watch before new workflow expansion."
        : recoveryForecastMode === "guided"
          ? "Recovery path remains usable with guided sequencing."
          : "Recovery and continuity forecast remain stable.";

  return {
    recoveryMeshHealth,
    continuityForecastHealth,
    disruptionForecastRisk,
    recoveryPathStability,
    delayPropagationRisk,
    escalationForecastRisk,
    recoveryForecastMode,
    explanation,
  };
}
