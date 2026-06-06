import type { SequencingHistoryState } from "@/lib/procurement/intelligence/operational-memory-fabric";

export type SequencingEffectivenessLearning = {
  sequencingEffectivenessTrend:
    | "stable"
    | "improving"
    | "needs_protection";
  sequencingLearningScore: number;
  explanation: string;
};

export function evaluateSequencingEffectiveness(
  sequencingHistory: SequencingHistoryState
): SequencingEffectivenessLearning {
  if (sequencingHistory.recommendedSequence === "continue_previous_context") {
    return {
      sequencingEffectivenessTrend: "needs_protection",
      sequencingLearningScore: Math.max(45, sequencingHistory.sequencingContinuityHistory - 10),
      explanation:
        "Previous executive context should remain protected before opening unrelated work.",
    };
  }

  if (sequencingHistory.recommendedSequence === "stabilize_repeated_chain") {
    return {
      sequencingEffectivenessTrend: "needs_protection",
      sequencingLearningScore: Math.max(50, sequencingHistory.sequencingContinuityHistory - 5),
      explanation:
        "Repeated operational chains should be stabilized with a narrower sequence.",
    };
  }

  return {
    sequencingEffectivenessTrend: "stable",
    sequencingLearningScore: sequencingHistory.sequencingContinuityHistory,
    explanation:
      "Sequencing history is stable and supports normal operational continuation.",
  };
}
