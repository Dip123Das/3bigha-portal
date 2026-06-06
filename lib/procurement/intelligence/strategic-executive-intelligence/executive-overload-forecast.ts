import type { ProcurementStabilityIndex } from "./procurement-stability-index";

export type ExecutiveOverloadForecast = {
  probability:
    | "low"
    | "moderate"
    | "elevated"
    | "high";
  explanation: string;
};

export function forecastExecutiveOverload(
  stability: ProcurementStabilityIndex
): ExecutiveOverloadForecast {
  const pressure =
    stability.overloadRisk +
    stability.interruptionRisk;

  if (pressure >= 150) {
    return {
      probability: "high",
      explanation:
        "Operational pressure patterns suggest elevated executive overload risk.",
    };
  }

  if (pressure >= 110) {
    return {
      probability: "elevated",
      explanation:
        "Interruption pressure is increasing and may destabilize sequencing.",
    };
  }

  if (pressure >= 70) {
    return {
      probability: "moderate",
      explanation:
        "Operational load remains manageable with calm sequencing.",
    };
  }

  return {
    probability: "low",
    explanation:
      "Executive operational pressure remains stable.",
  };
}
