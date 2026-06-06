import type { SupervisedOperationalAssistanceState } from "@/lib/procurement/intelligence/autonomous-operational-assistance";
import type { UnifiedOperationalConsciousnessState } from "@/lib/procurement/intelligence/unified-operational-consciousness";
import type { ProcurementStabilityIndex } from "@/lib/procurement/intelligence/strategic-executive-intelligence";

export type OperationalTrustIntelligence = {
  operationalTrustStability: number;
  executionReliability: number;
  continuityConfidence: number;
  workflowPredictability: number;
  recoveryConsistency: number;
  calmConfidenceHealth: number;
  trustMode:
    | "stable"
    | "guided"
    | "protected"
    | "recovery_supervised";
  explanation: string;
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function evaluateOperationalTrustIntelligence(input: {
  assistance: SupervisedOperationalAssistanceState;
  consciousness: UnifiedOperationalConsciousnessState;
  stability: ProcurementStabilityIndex;
}): OperationalTrustIntelligence {
  const executionReliability = clamp(
    (input.assistance.supervisedExecutionReadiness +
      input.stability.overallStability) / 2
  );

  const continuityConfidence = clamp(
    (input.consciousness.synchronizedContinuityStability +
      input.assistance.continuitySafeRecommendationLevel) / 2
  );

  const workflowPredictability = clamp(
    (input.consciousness.sequencingCoordinationIntegrity +
      input.stability.sequencingHealth) / 2
  );

  const recoveryConsistency = clamp(
    (input.assistance.calmAssistanceQuality +
      input.consciousness.calmNetworkHealth) / 2
  );

  const operationalTrustStability = clamp(
    (executionReliability +
      continuityConfidence +
      workflowPredictability +
      recoveryConsistency) / 4
  );

  const calmConfidenceHealth = clamp(
    (operationalTrustStability +
      input.consciousness.globalOperationalRhythm) / 2
  );

  const trustMode =
    input.assistance.assistanceMode === "prepare_recovery"
      ? "recovery_supervised"
      : continuityConfidence < 60
        ? "protected"
        : operationalTrustStability < 72
          ? "guided"
          : "stable";

  const explanation =
    trustMode === "recovery_supervised"
      ? "Operational trust remains supervised while recovery stabilization is active."
      : trustMode === "protected"
        ? "Continuity confidence weakened and operational context protection increased."
        : trustMode === "guided"
          ? "Execution reliability remains usable but guided sequencing is recommended."
          : "Operational trust and continuity confidence remain stable.";

  return {
    operationalTrustStability,
    executionReliability,
    continuityConfidence,
    workflowPredictability,
    recoveryConsistency,
    calmConfidenceHealth,
    trustMode,
    explanation,
  };
}
