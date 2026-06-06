import type { RecoveryForecastIntelligence } from "@/lib/procurement/intelligence/recovery-forecast-intelligence";
import type { ProcurementMissionIntelligenceGrid } from "@/lib/procurement/intelligence/procurement-mission-intelligence-grid";
import type { OperationalTrustIntelligence } from "@/lib/procurement/intelligence/operational-trust-intelligence";

export type SituationalCollaborationIntelligence = {
  situationalAwarenessHealth: number;
  collaborationContinuityHealth: number;
  humanCoordinationClarity: number;
  supplierResponsivenessAwareness: number;
  negotiationContinuityStability: number;
  sharedOperationalContextHealth: number;
  collaborationMode:
    | "stable"
    | "guided"
    | "clarify_human_context"
    | "coordinate_recovery";
  explanation: string;
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function evaluateSituationalCollaborationIntelligence(input: {
  recoveryForecast: RecoveryForecastIntelligence;
  missionGrid: ProcurementMissionIntelligenceGrid;
  trust: OperationalTrustIntelligence;
}): SituationalCollaborationIntelligence {
  const situationalAwarenessHealth = clamp(
    (input.missionGrid.missionIntelligenceHealth +
      input.recoveryForecast.continuityForecastHealth) / 2
  );

  const collaborationContinuityHealth = clamp(
    (input.trust.continuityConfidence +
      input.missionGrid.continuityAlignment) / 2
  );

  const humanCoordinationClarity = clamp(
    (input.trust.workflowPredictability +
      input.missionGrid.crossModuleSynchronization) / 2
  );

  const supplierResponsivenessAwareness = clamp(
    (input.trust.executionReliability +
      input.recoveryForecast.recoveryPathStability) / 2
  );

  const negotiationContinuityStability = clamp(
    (input.trust.operationalTrustStability +
      input.missionGrid.trustRoutingStability) / 2
  );

  const sharedOperationalContextHealth = clamp(
    (situationalAwarenessHealth +
      collaborationContinuityHealth +
      humanCoordinationClarity +
      supplierResponsivenessAwareness +
      negotiationContinuityStability) / 5
  );

  const collaborationMode =
    input.recoveryForecast.recoveryForecastMode === "recovery_first"
      ? "coordinate_recovery"
      : humanCoordinationClarity < 60
        ? "clarify_human_context"
        : sharedOperationalContextHealth < 74
          ? "guided"
          : "stable";

  const explanation =
    collaborationMode === "coordinate_recovery"
      ? "Human coordination should stay focused on recovery-sensitive workflows."
      : collaborationMode === "clarify_human_context"
        ? "Operational context should be clarified before spreading work across people."
        : collaborationMode === "guided"
          ? "Shared situational awareness remains guided for calmer collaboration."
          : "Situational collaboration remains stable.";

  return {
    situationalAwarenessHealth,
    collaborationContinuityHealth,
    humanCoordinationClarity,
    supplierResponsivenessAwareness,
    negotiationContinuityStability,
    sharedOperationalContextHealth,
    collaborationMode,
    explanation,
  };
}
