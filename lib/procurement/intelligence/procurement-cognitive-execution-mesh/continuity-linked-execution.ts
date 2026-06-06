import type { ProcurementCognitiveExecutionMesh } from "./procurement-cognitive-execution-mesh";

export type ContinuityLinkedExecutionState = {
  continuityExecutionMode:
    | "stable"
    | "protected"
    | "priority_continuity";
  continuityExecutionScore: number;
  explanation: string;
};

export function evaluateContinuityLinkedExecution(
  mesh: ProcurementCognitiveExecutionMesh
): ContinuityLinkedExecutionState {
  if (mesh.continuityLinkedExecutionHealth < 55) {
    return {
      continuityExecutionMode: "priority_continuity",
      continuityExecutionScore: mesh.continuityLinkedExecutionHealth,
      explanation:
        "Continuity-linked execution is prioritized before expanding new work.",
    };
  }

  if (mesh.continuityLinkedExecutionHealth < 75) {
    return {
      continuityExecutionMode: "protected",
      continuityExecutionScore: mesh.continuityLinkedExecutionHealth,
      explanation:
        "Continuity-linked execution remains protected for calm workflow handling.",
    };
  }

  return {
    continuityExecutionMode: "stable",
    continuityExecutionScore: mesh.continuityLinkedExecutionHealth,
    explanation:
      "Continuity-linked execution remains stable.",
  };
}
