import { computeMarketplaceIntelligence } from "@/lib/marketplace/marketplace-intelligence-ranking";

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
  const intelligence = computeMarketplaceIntelligence({
    distanceKm: input.distanceKm,
    geoScore: input.geoScore,
    demandScore: input.demandScore,
    liquidityScore: input.liquidityScore,
    reputationScore: input.reputationScore,
    authorityScore: input.authorityScore,
    conversionRate: input.conversionRate,
    responseRate: input.responseRate,
    activityScore: input.activityScore,
    boostPriority: Number(input.boostScore || 0),
    verified: Number(input.verificationScore || 0) > 0,
  });

  return {
    score:
      Number(input.aiScore || 0) +
      Number(input.unifiedScore || 0) +
      Number(input.freshnessScore || 0) +
      intelligence.score,
    distanceScore: intelligence.signals.distanceScore,
    reputationScore: intelligence.signals.reputationScore,
    authorityScore: intelligence.signals.authorityScore,
    conversionScore: intelligence.signals.conversionScore,
    responseScore: intelligence.signals.responseScore,
    activityScore: intelligence.signals.activityScore,
    demandScore: intelligence.signals.demandScore,
    liquidityScore: intelligence.signals.liquidityScore,
    reasons: intelligence.reasons,
  };
}
