import type { ProcurementCognitiveExecutionMesh } from "./procurement-cognitive-execution-mesh";

export type AdaptiveExecutionTimingState = {
  timingMode:
    | "stable"
    | "sequential"
    | "slow_and_protected";
  timingStability: number;
  explanation: string;
};

export function evaluateAdaptiveExecutionTiming(
  mesh: ProcurementCognitiveExecutionMesh
): AdaptiveExecutionTimingState {
  if (mesh.adaptiveExecutionTimingStability < 55) {
    return {
      timingMode: "slow_and_protected",
      timingStability: mesh.adaptiveExecutionTimingStability,
      explanation:
        "Execution timing should stay slow and protected until rhythm stabilizes.",
    };
  }

  if (mesh.adaptiveExecutionTimingStability < 75) {
    return {
      timingMode: "sequential",
      timingStability: mesh.adaptiveExecutionTimingStability,
      explanation:
        "Execution timing remains sequential to protect mission rhythm.",
    };
  }

  return {
    timingMode: "stable",
    timingStability: mesh.adaptiveExecutionTimingStability,
    explanation:
      "Execution timing remains stable.",
  };
}
