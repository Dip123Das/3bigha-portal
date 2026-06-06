import type { ProcurementCognitiveExecutionMesh } from "./procurement-cognitive-execution-mesh";

export type ExecutionPropagationState = {
  propagationMode:
    | "stable"
    | "guided"
    | "contained";
  propagationIntegrity: number;
  explanation: string;
};

export function evaluateExecutionPropagation(
  mesh: ProcurementCognitiveExecutionMesh
): ExecutionPropagationState {
  if (mesh.executionPropagationIntegrity < 55) {
    return {
      propagationMode: "contained",
      propagationIntegrity: mesh.executionPropagationIntegrity,
      explanation:
        "Execution propagation is contained to prevent unfinished workflow pressure from spreading.",
    };
  }

  if (mesh.executionPropagationIntegrity < 75) {
    return {
      propagationMode: "guided",
      propagationIntegrity: mesh.executionPropagationIntegrity,
      explanation:
        "Execution propagation remains guided across related procurement workflows.",
    };
  }

  return {
    propagationMode: "stable",
    propagationIntegrity: mesh.executionPropagationIntegrity,
    explanation:
      "Execution propagation remains stable.",
  };
}
