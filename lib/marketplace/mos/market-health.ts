export type MarketHealthLevel = "weak" | "developing" | "healthy" | "strong";

export type MarketHealth = {
  demandIndex: number;
  supplyIndex: number;
  gapIndex: number;
  growthIndex: number;
  liquidityIndex: number;
  competitionIndex: number;
  opportunityIndex: number;
  level: MarketHealthLevel;
  summary: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveLevel(score: number): MarketHealthLevel {
  if (score >= 80) return "strong";
  if (score >= 60) return "healthy";
  if (score >= 40) return "developing";
  return "weak";
}

export function buildMarketHealth(input: {
  demandScore: number;
  supplyScore: number;
  opportunityScore: number;
  vendorCount: number;
  rfqCount: number;
}): MarketHealth {
  const demandIndex = clamp(input.demandScore);
  const supplyIndex = clamp(input.supplyScore);
  const gapIndex = clamp(demandIndex - supplyIndex + 50);
  const growthIndex = clamp(demandIndex * 0.65 + input.opportunityScore * 0.35);
  const liquidityIndex = clamp(input.rfqCount * 8 + input.vendorCount * 3);
  const competitionIndex = clamp(input.vendorCount * 5);
  const opportunityIndex = clamp(input.opportunityScore);

  const overall = clamp(
    demandIndex * 0.25 +
      gapIndex * 0.2 +
      growthIndex * 0.2 +
      liquidityIndex * 0.15 +
      opportunityIndex * 0.2
  );

  const level = resolveLevel(overall);

  return {
    demandIndex,
    supplyIndex,
    gapIndex,
    growthIndex,
    liquidityIndex,
    competitionIndex,
    opportunityIndex,
    level,
    summary:
      level === "strong"
        ? "Strong marketplace opportunity detected in this geography."
        : level === "healthy"
        ? "Healthy marketplace activity with visible demand and supply balance."
        : level === "developing"
        ? "Developing marketplace signals; keep profile and listings active."
        : "Weak current marketplace signal; opportunities may grow as RFQs increase.",
  };
}
