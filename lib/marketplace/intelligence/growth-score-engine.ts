export interface MarketplaceGrowthScore {
  score: number;
  level: "weak" | "developing" | "healthy" | "strong";
}

export function buildGrowthScore(
  demandScore: number,
  supplyScore: number
): MarketplaceGrowthScore {
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        demandScore * 0.6 +
        supplyScore * 0.4
      )
    )
  );

  const level =
    score >= 80
      ? "strong"
      : score >= 60
        ? "healthy"
        : score >= 40
          ? "developing"
          : "weak";

  return {
    score,
    level,
  };
}
