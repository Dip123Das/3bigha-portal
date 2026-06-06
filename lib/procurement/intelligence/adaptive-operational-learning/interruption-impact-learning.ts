import type { OperationalMemoryHealth } from "@/lib/procurement/intelligence/operational-memory-fabric";

export type InterruptionImpactLearning = {
  interruptionImpactReduction: number;
  suppressionAdvice:
    | "normal"
    | "batch_low_value_earlier"
    | "protect_focus_window";
  explanation: string;
};

export function evaluateInterruptionImpactLearning(
  memory: OperationalMemoryHealth
): InterruptionImpactLearning {
  if (memory.interruptionRecurrenceLevel >= 65) {
    return {
      interruptionImpactReduction: Math.max(30, 100 - memory.interruptionRecurrenceLevel),
      suppressionAdvice: "protect_focus_window",
      explanation:
        "Interruption recurrence is high; protect a narrower executive focus window.",
    };
  }

  if (memory.interruptionRecurrenceLevel >= 35) {
    return {
      interruptionImpactReduction: Math.max(45, 100 - memory.interruptionRecurrenceLevel),
      suppressionAdvice: "batch_low_value_earlier",
      explanation:
        "Repeated interruptions should be batched earlier to reduce context switching.",
    };
  }

  return {
    interruptionImpactReduction: Math.max(70, 100 - memory.interruptionRecurrenceLevel),
    suppressionAdvice: "normal",
    explanation:
      "Interruption impact is controlled under current sequencing.",
  };
}
