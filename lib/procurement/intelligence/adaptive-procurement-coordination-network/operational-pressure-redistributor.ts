import type { AdaptiveProcurementCoordinationNetwork } from "./adaptive-procurement-coordination-network";

export type OperationalPressureRedistribution = {
  redistributionMode:
    | "stable"
    | "guided"
    | "redistributed";
  redistributionScore: number;
  explanation: string;
};

export function redistributeOperationalPressure(
  network: AdaptiveProcurementCoordinationNetwork
): OperationalPressureRedistribution {
  if (network.operationalPressureDistribution < 55) {
    return {
      redistributionMode: "redistributed",
      redistributionScore: network.operationalPressureDistribution,
      explanation:
        "Operational pressure redistribution activated to reduce overload concentration.",
    };
  }

  if (network.operationalPressureDistribution < 75) {
    return {
      redistributionMode: "guided",
      redistributionScore: network.operationalPressureDistribution,
      explanation:
        "Operational pressure redistribution remains guided.",
    };
  }

  return {
    redistributionMode: "stable",
    redistributionScore: network.operationalPressureDistribution,
    explanation:
      "Operational pressure distribution remains stable.",
  };
}
