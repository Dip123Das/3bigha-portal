export interface ExpansionRecommendation {
  module: string;
  score: number;
  recommendation: "expand" | "watch" | "stable";
  reason: string;
}

export function buildExpansionRecommendation(
  module: string,
  growthScore: number,
  shortageScore: number
): ExpansionRecommendation {
  const score = Math.round(
    growthScore * 0.6 +
    shortageScore * 0.4
  );

  if (score >= 70) {
    return {
      module,
      score,
      recommendation: "expand",
      reason: "High growth and unmet demand detected.",
    };
  }

  if (score >= 40) {
    return {
      module,
      score,
      recommendation: "watch",
      reason: "Moderate growth opportunity detected.",
    };
  }

  return {
    module,
    score,
    recommendation: "stable",
    reason: "Current marketplace appears balanced.",
  };
}
