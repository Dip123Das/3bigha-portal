import type { OperationalTrustIntelligence } from "./operational-trust-intelligence";

export type ExecutionReliabilityState = {
  reliabilityLevel:
    | "stable"
    | "monitored"
    | "supervised";
  reliabilityScore: number;
  explanation: string;
};

export function evaluateExecutionReliability(
  trust: OperationalTrustIntelligence
): ExecutionReliabilityState {
  if (trust.executionReliability < 55) {
    return {
      reliabilityLevel: "supervised",
      reliabilityScore: trust.executionReliability,
      explanation:
        "Execution flow requires stronger supervision before operational expansion.",
    };
  }

  if (trust.executionReliability < 75) {
    return {
      reliabilityLevel: "monitored",
      reliabilityScore: trust.executionReliability,
      explanation:
        "Execution reliability is acceptable but should remain monitored.",
    };
  }

  return {
    reliabilityLevel: "stable",
    reliabilityScore: trust.executionReliability,
    explanation:
      "Execution reliability remains stable for calm operational handling.",
  };
}
