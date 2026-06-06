import type { OperationalMemoryEntry } from "./operational-memory-fabric";

export type SequencingHistoryState = {
  sequencingContinuityHistory: number;
  recommendedSequence:
    | "normal"
    | "continue_previous_context"
    | "stabilize_repeated_chain";
  explanation: string;
};

export function evaluateSequencingHistory(
  entries: OperationalMemoryEntry[]
): SequencingHistoryState {
  const repeated = entries.filter((entry) => entry.recurrenceCount > 1).length;
  const critical = entries.filter((entry) => entry.severity === "critical").length;

  if (critical > 0) {
    return {
      sequencingContinuityHistory: Math.max(40, 80 - critical * 10),
      recommendedSequence: "continue_previous_context",
      explanation:
        "A high-value unfinished workflow should remain in sequence before new work is opened.",
    };
  }

  if (repeated > 0) {
    return {
      sequencingContinuityHistory: Math.max(45, 85 - repeated * 8),
      recommendedSequence: "stabilize_repeated_chain",
      explanation:
        "A repeated operational chain was found and should be stabilized before expanding attention.",
    };
  }

  return {
    sequencingContinuityHistory: 92,
    recommendedSequence: "normal",
    explanation:
      "Sequencing history remains stable for normal procurement flow.",
  };
}
