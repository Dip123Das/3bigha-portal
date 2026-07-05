export type MarketplaceIntelligenceInput = {
  distanceKm?: number | null;
  geoScore?: number | null;

  demandScore?: number | null;
  liquidityScore?: number | null;

  reputationScore?: number | null;
  authorityScore?: number | null;

  conversionRate?: number | null;
  responseRate?: number | null;

  activityScore?: number | null;
  boostPriority?: number | null;

  verified?: boolean;
  freshnessHours?: number | null;
  rfqLoad?: number | null;
};

export type MarketplaceIntelligenceResult = {
  score: number;
  confidence: number;
  reasons: string[];
  signals: {
    distanceScore: number;
    geoScore: number;
    demandScore: number;
    liquidityScore: number;
    reputationScore: number;
    authorityScore: number;
    conversionScore: number;
    responseScore: number;
    activityScore: number;
    boostScore: number;
    verificationScore: number;
    freshnessScore: number;
    rfqAvailabilityScore: number;
  };
};

function num(value?: number | null) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function percent(value?: number | null, maxWeight = 10) {
  const n = num(value);
  if (n <= 0) return 0;
  return Math.min(maxWeight, Math.round((Math.min(n, 100) / 100) * maxWeight));
}

function distanceScore(distanceKm?: number | null) {
  const km = num(distanceKm);
  if (!distanceKm && distanceKm !== 0) return 0;
  if (km <= 5) return 30;
  if (km <= 15) return 20;
  if (km <= 30) return 10;
  return 0;
}

function freshnessScore(freshnessHours?: number | null) {
  const h = num(freshnessHours);
  if (!freshnessHours && freshnessHours !== 0) return 0;
  if (h <= 24) return 5;
  if (h <= 72) return 3;
  if (h <= 168) return 1;
  return 0;
}

function rfqAvailabilityScore(rfqLoad?: number | null) {
  const load = num(rfqLoad);
  if (!rfqLoad && rfqLoad !== 0) return 0;
  if (load <= 3) return 5;
  if (load <= 10) return 2;
  return -4;
}

export function computeMarketplaceIntelligence(
  input: MarketplaceIntelligenceInput
): MarketplaceIntelligenceResult {
  const signals = {
    distanceScore: distanceScore(input.distanceKm),
    geoScore: num(input.geoScore),
    demandScore: percent(input.demandScore, 8),
    liquidityScore: percent(input.liquidityScore, 8),
    reputationScore: percent(input.reputationScore, 10),
    authorityScore: percent(input.authorityScore, 8),
    conversionScore: percent(input.conversionRate, 8),
    responseScore: percent(input.responseRate, 8),
    activityScore: num(input.activityScore),
    boostScore: num(input.boostPriority),
    verificationScore: input.verified ? 6 : 0,
    freshnessScore: freshnessScore(input.freshnessHours),
    rfqAvailabilityScore: rfqAvailabilityScore(input.rfqLoad),
  };

  const score = Object.values(signals).reduce((sum, value) => sum + value, 0);

  const reasons: string[] = [];
  if (signals.distanceScore >= 30) reasons.push("Very close");
  else if (signals.distanceScore >= 20) reasons.push("Nearby");
  else if (signals.distanceScore >= 10) reasons.push("Within service area");
  if (signals.geoScore > 0) reasons.push("Geo match");
  if (signals.demandScore >= 6) reasons.push("High demand");
  if (signals.liquidityScore >= 6) reasons.push("Strong market liquidity");
  if (signals.reputationScore >= 7) reasons.push("Excellent reputation");
  if (signals.authorityScore >= 6) reasons.push("High authority");
  if (signals.conversionScore >= 5) reasons.push("Good conversion record");
  if (signals.responseScore >= 5) reasons.push("Responsive vendor");
  if (signals.verificationScore > 0) reasons.push("Verified vendor");
  if (signals.boostScore > 0) reasons.push("Boosted vendor");
  if (signals.freshnessScore > 0) reasons.push("Recently active");
  if (signals.rfqAvailabilityScore < 0) reasons.push("High RFQ load");

  return {
    score,
    confidence: Math.min(100, Math.max(0, Math.round(score))),
    reasons,
    signals,
  };
}
