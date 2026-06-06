import type { ProcurementCognitiveExecutionMesh } from "@/lib/procurement/intelligence/procurement-cognitive-execution-mesh";
import type { AdaptiveProcurementCoordinationNetwork } from "@/lib/procurement/intelligence/adaptive-procurement-coordination-network";
import type { ProcurementMissionIntelligenceGrid } from "@/lib/procurement/intelligence/procurement-mission-intelligence-grid";

export type ProcurementContinuityNervousSystem = {
  continuityNervousStability: number;
  continuityPulseSynchronization: number;
  operationalReflexStability: number;
  continuityAnomalyResilience: number;
  missionPulseCoherence: number;
  executionRhythmReflexStability: number;
  procurementNervousSystemHealth: number;
  nervousMode:
    | "stable"
    | "guided"
    | "pulse_sync"
    | "reflex_stabilization";
  explanation: string;
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function evaluateProcurementContinuityNervousSystem(input: {
  mesh: ProcurementCognitiveExecutionMesh;
  coordination: AdaptiveProcurementCoordinationNetwork;
  missionGrid: ProcurementMissionIntelligenceGrid;
}): ProcurementContinuityNervousSystem {
  const continuityPulseSynchronization = clamp(
    (input.mesh.continuityLinkedExecutionHealth +
      input.missionGrid.continuityAlignment) / 2
  );

  const operationalReflexStability = clamp(
    (input.coordination.coordinationRhythmStability +
      input.mesh.adaptiveExecutionTimingStability) / 2
  );

  const continuityAnomalyResilience = clamp(
    (input.mesh.executionPropagationIntegrity +
      input.coordination.operationalPressureDistribution) / 2
  );

  const missionPulseCoherence = clamp(
    (input.missionGrid.missionIntelligenceHealth +
      input.mesh.procurementCognitiveMeshHealth) / 2
  );

  const executionRhythmReflexStability = clamp(
    (input.mesh.adaptiveExecutionTimingStability +
      input.missionGrid.operationalRhythmSynchronization) / 2
  );

  const continuityNervousStability = clamp(
    (continuityPulseSynchronization +
      operationalReflexStability +
      continuityAnomalyResilience +
      missionPulseCoherence +
      executionRhythmReflexStability) / 5
  );

  const procurementNervousSystemHealth = continuityNervousStability;

  const nervousMode =
    continuityAnomalyResilience < 58
      ? "reflex_stabilization"
      : continuityPulseSynchronization < 64
        ? "pulse_sync"
        : procurementNervousSystemHealth < 74
          ? "guided"
          : "stable";

  const explanation =
    nervousMode === "reflex_stabilization"
      ? "Continuity reflex stabilization activated to reduce operational shock propagation."
      : nervousMode === "pulse_sync"
        ? "Continuity pulse synchronization increased across mission workflows."
        : nervousMode === "guided"
          ? "Continuity nervous system remains guided for calm operational rhythm."
          : "Continuity nervous system remains stable.";

  return {
    continuityNervousStability,
    continuityPulseSynchronization,
    operationalReflexStability,
    continuityAnomalyResilience,
    missionPulseCoherence,
    executionRhythmReflexStability,
    procurementNervousSystemHealth,
    nervousMode,
    explanation,
  };
}
