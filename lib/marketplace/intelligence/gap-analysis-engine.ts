import type { GapAnalysis } from "./types";

function clamp(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function analyzeGap(
  demand: number,
  supply: number
): GapAnalysis {
  const normalizedDemand = clamp(demand);
  const normalizedSupply = clamp(supply);
  const gap = normalizedDemand - normalizedSupply;

  const opportunityScore = clamp(
    normalizedDemand * 0.7 +
      Math.max(0, gap) * 0.3
  );

  return {
    demand: normalizedDemand,
    supply: normalizedSupply,
    gap,
    opportunityScore,

    classification:
      gap > 20
        ? "underserved"
        : gap < -20
          ? "oversupplied"
          : "balanced",
  };
}
