export type MarketplaceSelfOptimizationInput = {
  module?: string | null;
  category?: string | null;
  opportunityScore?: number | null;
  shortageScore?: number | null;
  views?: number | null;
  clicks?: number | null;
  registrationsCompleted?: number | null;
  approvedVendors?: number | null;
  firstListings?: number | null;
};

export type MarketplaceSelfOptimizationResult = {
  performanceScore: number;
  conversionScore: number;
  optimizationScore: number;
  recommendation: "promote_immediately" | "increase_visibility" | "watch" | "needs_improvement";
  recommendationLabel: string;
  reason: string;
};

function clamp(value: unknown, min = 0, max = 100) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function calculateMarketplaceSelfOptimization(
  input: MarketplaceSelfOptimizationInput
): MarketplaceSelfOptimizationResult {
  const opportunityScore = clamp(input.opportunityScore);
  const shortageScore = clamp(input.shortageScore);

  const views = Math.max(0, Number(input.views || 0));
  const clicks = Math.max(0, Number(input.clicks || 0));
  const completed = Math.max(0, Number(input.registrationsCompleted || 0));
  const approved = Math.max(0, Number(input.approvedVendors || 0));
  const listings = Math.max(0, Number(input.firstListings || 0));

  const conversionScore = clamp(
    listings * 50 + approved * 20 + completed * 10 + clicks * 2 + views * 0.25
  );

  const performanceScore = clamp(
    listings * 50 + approved * 20 + completed * 10 + clicks * 2 + views * 0.25
  );

  const optimizationScore = Math.round(
    shortageScore * 0.5 + conversionScore * 0.35 + opportunityScore * 0.15
  );

  if (optimizationScore >= 75 && listings > 0) {
    return {
      performanceScore,
      conversionScore,
      optimizationScore,
      recommendation: "promote_immediately",
      recommendationLabel: "Promote Immediately",
      reason: "High shortage and proven vendor activation. Increase homepage, banner and navigation visibility.",
    };
  }

  if (optimizationScore >= 55 && (clicks > 0 || approved > 0)) {
    return {
      performanceScore,
      conversionScore,
      optimizationScore,
      recommendation: "increase_visibility",
      recommendationLabel: "Increase Visibility",
      reason: "Demand is strong and early conversion signals are positive. Give this opportunity more public exposure.",
    };
  }

  if (views > 20 && clicks === 0) {
    return {
      performanceScore,
      conversionScore,
      optimizationScore,
      recommendation: "needs_improvement",
      recommendationLabel: "Needs Improvement",
      reason: "People are seeing this opportunity but not clicking. Improve wording, location clarity or CTA placement.",
    };
  }

  return {
    performanceScore,
    conversionScore,
    optimizationScore,
    recommendation: "watch",
    recommendationLabel: "Watch",
    reason: "Keep monitoring. Not enough conversion evidence yet to change placement.",
  };
}
