import type { AdaptiveProcurementCoordinationNetwork } from "./adaptive-procurement-coordination-network";

export type ContinuityLoadBalancerState = {
  balancingMode:
    | "stable"
    | "protected"
    | "continuity_priority";
  balancingScore: number;
  explanation: string;
};

export function evaluateContinuityLoadBalancing(
  network: AdaptiveProcurementCoordinationNetwork
): ContinuityLoadBalancerState {
  if (network.continuityBalancingStability < 55) {
    return {
      balancingMode: "continuity_priority",
      balancingScore: network.continuityBalancingStability,
      explanation:
        "Continuity balancing prioritized unfinished workflow stability.",
    };
  }

  if (network.continuityBalancingStability < 75) {
    return {
      balancingMode: "protected",
      balancingScore: network.continuityBalancingStability,
      explanation:
        "Continuity balancing remains protected for calmer execution.",
    };
  }

  return {
    balancingMode: "stable",
    balancingScore: network.continuityBalancingStability,
    explanation:
      "Continuity balancing remains stable.",
  };
}
