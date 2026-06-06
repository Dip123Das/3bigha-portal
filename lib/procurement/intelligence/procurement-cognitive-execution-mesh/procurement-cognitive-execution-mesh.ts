import type { AdaptiveProcurementCoordinationNetwork } from "@/lib/procurement/intelligence/adaptive-procurement-coordination-network";
import type { ProcurementMissionIntelligenceGrid } from "@/lib/procurement/intelligence/procurement-mission-intelligence-grid";
import type { OperationalMemoryHealth } from "@/lib/procurement/intelligence/operational-memory-fabric";

export type ProcurementCognitiveExecutionMesh = {
  executionMeshCoherence: number;
  dependencySynchronizationStability: number;
  continuityLinkedExecutionHealth: number;
  executionPropagationIntegrity: number;
  adaptiveExecutionTimingStability: number;
  executionMemorySynchronization: number;
  procurementCognitiveMeshHealth: number;
  meshMode:
    | "stable"
    | "guided"
    | "dependency_sync"
    | "continuity_protection";
  explanation: string;
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function evaluateProcurementCognitiveExecutionMesh(input: {
  coordination: AdaptiveProcurementCoordinationNetwork;
  missionGrid: ProcurementMissionIntelligenceGrid;
  memory: OperationalMemoryHealth;
}): ProcurementCognitiveExecutionMesh {
  const executionMeshCoherence = clamp(
    (input.coordination.coordinationHarmony +
      input.missionGrid.missionGridCoherence) / 2
  );

  const dependencySynchronizationStability = clamp(
    (input.coordination.adaptiveRoutingHealth +
      input.missionGrid.crossModuleSynchronization) / 2
  );

  const continuityLinkedExecutionHealth = clamp(
    (input.coordination.continuityBalancingStability +
      input.memory.continuityPersistenceHealth) / 2
  );

  const executionPropagationIntegrity = clamp(
    (input.coordination.operationalPressureDistribution +
      input.missionGrid.recoveryCoordinationIntegrity) / 2
  );

  const adaptiveExecutionTimingStability = clamp(
    (input.coordination.coordinationRhythmStability +
      input.missionGrid.operationalRhythmSynchronization) / 2
  );

  const executionMemorySynchronization = clamp(
    (input.memory.operationalMemoryConfidence +
      input.memory.executiveContextStability) / 2
  );

  const procurementCognitiveMeshHealth = clamp(
    (executionMeshCoherence +
      dependencySynchronizationStability +
      continuityLinkedExecutionHealth +
      executionPropagationIntegrity +
      adaptiveExecutionTimingStability +
      executionMemorySynchronization) / 6
  );

  const meshMode =
    continuityLinkedExecutionHealth < 58
      ? "continuity_protection"
      : dependencySynchronizationStability < 62
        ? "dependency_sync"
        : procurementCognitiveMeshHealth < 74
          ? "guided"
          : "stable";

  const explanation =
    meshMode === "continuity_protection"
      ? "Execution mesh increased continuity-linked protection for unfinished workflows."
      : meshMode === "dependency_sync"
        ? "Execution mesh synchronized dependent procurement signals to reduce fragmentation."
        : meshMode === "guided"
          ? "Execution mesh remains guided for calmer cross-workflow execution."
          : "Cognitive execution mesh remains stable across procurement workflows.";

  return {
    executionMeshCoherence,
    dependencySynchronizationStability,
    continuityLinkedExecutionHealth,
    executionPropagationIntegrity,
    adaptiveExecutionTimingStability,
    executionMemorySynchronization,
    procurementCognitiveMeshHealth,
    meshMode,
    explanation,
  };
}
