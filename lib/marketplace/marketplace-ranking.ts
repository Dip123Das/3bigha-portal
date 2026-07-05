export type MarketplaceRankingInput = {
  aiScore?: number | null;
  unifiedScore?: number | null;
  geoScore?: number | null;
  distanceKm?: number | null;
  verificationScore?: number | null;
  boostScore?: number | null;
  freshnessScore?: number | null;

  reputationScore?: number | null;
  authorityScore?: number | null;
  conversionRate?: number | null;
  responseRate?: number | null;
  activityScore?: number | null;

  demandScore?: number | null;
  liquidityScore?: number | null;
};

export function computeDistanceScore(distanceKm?: number | null) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return 0;
  if (distanceKm <= 5) return 30;
  if (distanceKm <= 15) return 20;
  if (distanceKm <= 30) return 10;
  return 0;
}


function normalizePercentage(value?: number | null, maxWeight = 10) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(maxWeight, Math.round((Math.min(n, 100) / 100) * maxWeight));
}

export function computeMarketplaceRanking(input: MarketplaceRankingInput) {
  const distanceScore = computeDistanceScore(input.distanceKm);

  const reputationScore =
    normalizePercentage(input.reputationScore, 10);

  const authorityScore =
    normalizePercentage(input.authorityScore, 8);

  const conversionScore =
    normalizePercentage(input.conversionRate, 8);

  const responseScore =
    normalizePercentage(input.responseRate, 8);

  const activityScore =
    Number(input.activityScore || 0);

  const demandScore =
    normalizePercentage(input.demandScore, 8);

  const liquidityScore =
    normalizePercentage(input.liquidityScore, 8);

  const score =
    Number(input.aiScore || 0) +
    Number(input.unifiedScore || 0) +
    Number(input.geoScore || 0) +
    distanceScore +
    Number(input.verificationScore || 0) +
    Number(input.boostScore || 0) +
    Number(input.freshnessScore || 0) +
    reputationScore +
    authorityScore +
    conversionScore +
    responseScore +
    activityScore +
    demandScore +
    liquidityScore;

  return {
    score,
    distanceScore,
    reputationScore,
    authorityScore,
    conversionScore,
    responseScore,
    activityScore,
    demandScore,
    liquidityScore,
  };
}
