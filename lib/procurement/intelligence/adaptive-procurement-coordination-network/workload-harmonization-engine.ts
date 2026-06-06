import type { AdaptiveProcurementCoordinationNetwork } from "./adaptive-procurement-coordination-network";

export type WorkloadHarmonizationState = {
  harmonizationMode:
    | "stable"
    | "guided"
    | "rebalanced";
  harmonizationScore: number;
  explanation: string;
};

export function evaluateWorkloadHarmonization(
  network: AdaptiveProcurementCoordinationNetwork
): WorkloadHarmonizationState {
  if (network.workloadBalanceIntegrity < 55) {
    return {
      harmonizationMode: "rebalanced",
      harmonizationScore: network.workloadBalanceIntegrity,
      explanation:
        "Executive workload balancing increased to reduce operational concentration.",
    };
  }

  if (network.workloadBalanceIntegrity < 75) {
    return {
      harmonizationMode: "guided",
      harmonizationScore: network.workloadBalanceIntegrity,
      explanation:
        "Workload harmonization remains guided for calmer mission handling.",
    };
  }

  return {
    harmonizationMode: "stable",
    harmonizationScore: network.workloadBalanceIntegrity,
    explanation:
      "Operational workload balance remains stable.",
  };
}
