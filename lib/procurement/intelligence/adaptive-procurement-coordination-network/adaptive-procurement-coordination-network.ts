import type { ProcurementMissionIntelligenceGrid } from "@/lib/procurement/intelligence/procurement-mission-intelligence-grid";
import type { OperationalTrustIntelligence } from "@/lib/procurement/intelligence/operational-trust-intelligence";
import type { SupervisedOperationalAssistanceState } from "@/lib/procurement/intelligence/autonomous-operational-assistance";

export type AdaptiveProcurementCoordinationNetwork = {
  coordinationHarmony: number;
  workloadBalanceIntegrity: number;
  continuityBalancingStability: number;
  adaptiveRoutingHealth: number;
  operationalPressureDistribution: number;
  coordinationRhythmStability: number;
  procurementNetworkHealth: number;
  coordinationMode:
    | "stable"
    | "guided"
    | "pressure_balancing"
    | "continuity_protection";
  explanation: string;
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function evaluateAdaptiveProcurementCoordinationNetwork(input: {
  missionGrid: ProcurementMissionIntelligenceGrid;
  trust: OperationalTrustIntelligence;
  assistance: SupervisedOperationalAssistanceState;
}): AdaptiveProcurementCoordinationNetwork {
  const coordinationHarmony = clamp(
    (input.missionGrid.missionGridCoherence +
      input.missionGrid.crossModuleSynchronization) / 2
  );

  const workloadBalanceIntegrity = clamp(
    (input.assistance.executiveWorkloadReductionScore +
      input.trust.executionReliability) / 2
  );

  const continuityBalancingStability = clamp(
    (input.missionGrid.continuityAlignment +
      input.trust.continuityConfidence) / 2
  );

  const adaptiveRoutingHealth = clamp(
    (input.missionGrid.trustRoutingStability +
      input.trust.workflowPredictability) / 2
  );

  const operationalPressureDistribution = clamp(
    (input.missionGrid.recoveryCoordinationIntegrity +
      input.assistance.calmAssistanceQuality) / 2
  );

  const coordinationRhythmStability = clamp(
    (input.missionGrid.operationalRhythmSynchronization +
      input.trust.calmConfidenceHealth) / 2
  );

  const procurementNetworkHealth = clamp(
    (coordinationHarmony +
      workloadBalanceIntegrity +
      continuityBalancingStability +
      adaptiveRoutingHealth +
      operationalPressureDistribution +
      coordinationRhythmStability) / 6
  );

  const coordinationMode =
    operationalPressureDistribution < 55
      ? "pressure_balancing"
      : continuityBalancingStability < 60
        ? "continuity_protection"
        : procurementNetworkHealth < 72
          ? "guided"
          : "stable";

  const explanation =
    coordinationMode === "pressure_balancing"
      ? "Operational pressure balancing activated to reduce concentrated executive load."
      : coordinationMode === "continuity_protection"
        ? "Continuity-safe balancing increased across fragmented workflows."
        : coordinationMode === "guided"
          ? "Adaptive procurement coordination remains guided for calmer execution."
          : "Procurement coordination network remains stable and harmonized.";

  return {
    coordinationHarmony,
    workloadBalanceIntegrity,
    continuityBalancingStability,
    adaptiveRoutingHealth,
    operationalPressureDistribution,
    coordinationRhythmStability,
    procurementNetworkHealth,
    coordinationMode,
    explanation,
  };
}
