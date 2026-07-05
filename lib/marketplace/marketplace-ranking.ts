export type MarketplaceRankingInput = {
  aiScore?: number | null;
  unifiedScore?: number | null;
  geoScore?: number | null;
  distanceKm?: number | null;
  verificationScore?: number | null;
  boostScore?: number | null;
  freshnessScore?: number | null;
};

export function computeDistanceScore(distanceKm?: number | null) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return 0;
  if (distanceKm <= 5) return 30;
  if (distanceKm <= 15) return 20;
  if (distanceKm <= 30) return 10;
  return 0;
}

export function computeMarketplaceRanking(input: MarketplaceRankingInput) {
  const distanceScore = computeDistanceScore(input.distanceKm);

  const score =
    Number(input.aiScore || 0) +
    Number(input.unifiedScore || 0) +
    Number(input.geoScore || 0) +
    distanceScore +
    Number(input.verificationScore || 0) +
    Number(input.boostScore || 0) +
    Number(input.freshnessScore || 0);

  return {
    score,
    distanceScore,
  };
}
