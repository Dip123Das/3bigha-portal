import type { OperationalMemoryEntry } from "./operational-memory-fabric";

export type RecoveryEffectivenessMemory = {
  recoveryEffectivenessTrend:
    | "stable"
    | "needs_followup"
    | "recovery_pressure_repeating";
  recoveryMemoryScore: number;
  explanation: string;
};

export function evaluateRecoveryEffectivenessMemory(
  entries: OperationalMemoryEntry[]
): RecoveryEffectivenessMemory {
  const critical = entries.filter((entry) => entry.severity === "critical").length;
  const actionable = entries.filter((entry) => entry.severity === "actionable").length;

  if (critical >= 2) {
    return {
      recoveryEffectivenessTrend: "recovery_pressure_repeating",
      recoveryMemoryScore: 48,
      explanation:
        "Recovery pressure appears repeatedly and should be reviewed before new escalation.",
    };
  }

  if (actionable >= 3) {
    return {
      recoveryEffectivenessTrend: "needs_followup",
      recoveryMemoryScore: 68,
      explanation:
        "Several actionable items remain open; calm follow-up sequencing is recommended.",
    };
  }

  return {
    recoveryEffectivenessTrend: "stable",
    recoveryMemoryScore: 88,
    explanation:
      "Recovery memory is stable and does not show repeated failure pressure.",
  };
}
