import type { OperationalTrustIntelligence } from "./operational-trust-intelligence";

export type WorkflowPredictabilityState = {
  predictabilityLevel:
    | "stable"
    | "guided"
    | "volatile";
  predictabilityScore: number;
  explanation: string;
};

export function evaluateWorkflowPredictability(
  trust: OperationalTrustIntelligence
): WorkflowPredictabilityState {
  if (trust.workflowPredictability < 50) {
    return {
      predictabilityLevel: "volatile",
      predictabilityScore: trust.workflowPredictability,
      explanation:
        "Workflow predictability weakened because sequencing consistency is unstable.",
    };
  }

  if (trust.workflowPredictability < 72) {
    return {
      predictabilityLevel: "guided",
      predictabilityScore: trust.workflowPredictability,
      explanation:
        "Workflow predictability remains usable with guided operational pacing.",
    };
  }

  return {
    predictabilityLevel: "stable",
    predictabilityScore: trust.workflowPredictability,
    explanation:
      "Workflow predictability remains stable and continuity-safe.",
    };
}
