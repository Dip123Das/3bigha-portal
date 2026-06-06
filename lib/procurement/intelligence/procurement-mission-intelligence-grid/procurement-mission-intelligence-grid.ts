import type { OperationalTrustIntelligence } from "@/lib/procurement/intelligence/operational-trust-intelligence";
import type { UnifiedOperationalConsciousnessState } from "@/lib/procurement/intelligence/unified-operational-consciousness";
import type { SupervisedOperationalAssistanceState } from "@/lib/procurement/intelligence/autonomous-operational-assistance";

export type ProcurementMissionIntelligenceGrid = {
  missionGridCoherence: number;
  crossModuleSynchronization: number;
  continuityAlignment: number;
  recoveryCoordinationIntegrity: number;
  trustRoutingStability: number;
  operationalRhythmSynchronization: number;
  missionIntelligenceHealth: number;
  gridMode:
    | "stable"
    | "guided"
    | "synchronized_recovery"
    | "continuity_protection";
  explanation: string;
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function evaluateProcurementMissionGrid(input: {
  trust: OperationalTrustIntelligence;
  consciousness: UnifiedOperationalConsciousnessState;
  assistance: SupervisedOperationalAssistanceState;
}): ProcurementMissionIntelligenceGrid {
  const missionGridCoherence = clamp(
    (input.consciousness.unifiedMissionCoherence +
      input.trust.operationalTrustStability) / 2
  );

  const crossModuleSynchronization = clamp(
    (input.consciousness.operationalConsciousnessStability +
      input.assistance.operationalAssistanceHealth) / 2
  );

  const continuityAlignment = clamp(
    (input.consciousness.synchronizedContinuityStability +
      input.trust.continuityConfidence) / 2
  );

  const recoveryCoordinationIntegrity = clamp(
    (input.trust.recoveryConsistency +
      input.assistance.calmAssistanceQuality) / 2
  );

  const trustRoutingStability = clamp(
    (input.trust.executionReliability +
      input.trust.workflowPredictability) / 2
  );

  const operationalRhythmSynchronization = clamp(
    (input.consciousness.globalOperationalRhythm +
      input.trust.calmConfidenceHealth) / 2
  );

  const missionIntelligenceHealth = clamp(
    (missionGridCoherence +
      crossModuleSynchronization +
      continuityAlignment +
      recoveryCoordinationIntegrity +
      trustRoutingStability +
      operationalRhythmSynchronization) / 6
  );

  const gridMode =
    input.assistance.assistanceMode === "prepare_recovery"
      ? "synchronized_recovery"
      : continuityAlignment < 60
        ? "continuity_protection"
        : missionGridCoherence < 72
          ? "guided"
          : "stable";

  const explanation =
    gridMode === "synchronized_recovery"
      ? "Mission grid synchronized recovery pacing across procurement modules."
      : gridMode === "continuity_protection"
        ? "Mission grid increased continuity protection across fragmented workflows."
        : gridMode === "guided"
          ? "Mission-wide sequencing guidance was synchronized across modules."
          : "Mission grid synchronization remains stable.";

  return {
    missionGridCoherence,
    crossModuleSynchronization,
    continuityAlignment,
    recoveryCoordinationIntegrity,
    trustRoutingStability,
    operationalRhythmSynchronization,
    missionIntelligenceHealth,
    gridMode,
    explanation,
  };
}
