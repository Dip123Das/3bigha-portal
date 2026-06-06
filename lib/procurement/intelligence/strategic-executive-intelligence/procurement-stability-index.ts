import type { ExecutiveCognitiveState } from "@/lib/procurement/intelligence/executive-cognitive-os";

export type ProcurementStabilityIndex = {
  overallStability: number;
  overloadRisk: number;
  continuityRisk: number;
  interruptionRisk: number;
  sequencingHealth: number;
  calmSustainability: number;
  explanation: string[];
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function evaluateProcurementStabilityIndex(
  cognitive: ExecutiveCognitiveState
): ProcurementStabilityIndex {
  const overloadRisk = clamp(cognitive.cognitiveLoadPressure);

  const continuityRisk = clamp(
    100 - cognitive.continuityIntegrity
  );

  const interruptionRisk = clamp(
    100 - cognitive.focusResilience
  );

  const sequencingHealth = clamp(
    cognitive.sequencingEfficiency
  );

  const calmSustainability = clamp(
    (cognitive.focusResilience +
      cognitive.operationalRhythmStability +
      cognitive.executiveRecoveryHealth) / 3
  );

  const overallStability = clamp(
    (sequencingHealth +
      calmSustainability +
      cognitive.missionCoherence) / 3
  );

  const explanation: string[] = [];

  if (overloadRisk >= 70) {
    explanation.push(
      "Executive overload pressure is elevated and may destabilize operational sequencing."
    );
  }

  if (continuityRisk >= 50) {
    explanation.push(
      "Continuity integrity is weakening because operational attention is fragmented."
    );
  }

  if (interruptionRisk >= 45) {
    explanation.push(
      "Repeated interruptions are increasing executive context switching."
    );
  }

  if (!explanation.length) {
    explanation.push(
      "Operational stability remains suitable for calm sequential execution."
    );
  }

  return {
    overallStability,
    overloadRisk,
    continuityRisk,
    interruptionRisk,
    sequencingHealth,
    calmSustainability,
    explanation,
  };
}
